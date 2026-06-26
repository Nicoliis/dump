/**
 * CardRelations — computed "related" field for each card.
 *
 * The `related` field is expensive to produce (full desc parse + DB scans),
 * so it is computed exactly ONCE per card and persisted in localStorage.
 *
 * Cached structure per card:
 *   { types: string[], attributes: string[], mentionNames: string[] }
 *
 * - `types`        : own type tokens + race + types mentioned in the desc text
 * - `attributes`   : own attribute + attributes mentioned in the desc text
 * - `mentionNames` : raw card names found inside double-quotes in the desc
 *                    (stored as names, resolved to IDs on-demand so new DB
 *                    entries are automatically picked up)
 *
 * Public surface:
 *   computeRelated(card)                   → related object (cached)
 *   getRelated(card)                       → same as computeRelated
 *   hasRelated(cardId)                     → boolean
 *   getRelatedCards(cardId, depth=1)       → { byType, byAttribute, mentioned, mentionedBy }
 *   invalidateCard(cardId)                 → drop one entry from cache
 *   clearCache()                           → nuke everything
 *   getStats()                             → { computed, storageBytes }
 */

const CardRelations = (() => {
    const STORAGE_KEY = 'ygoCardRelations';

    /* ------------------------------------------------------------------ */
    /*  Known vocabulary for description scanning                          */
    /* ------------------------------------------------------------------ */

    const KNOWN_ATTRIBUTES = ['DARK', 'LIGHT', 'EARTH', 'WATER', 'FIRE', 'WIND', 'DIVINE'];

    const KNOWN_RACES = [
        'Warrior', 'Spellcaster', 'Fairy', 'Fiend', 'Zombie', 'Machine',
        'Aqua', 'Pyro', 'Rock', 'Winged Beast', 'Plant', 'Insect', 'Thunder',
        'Dragon', 'Beast', 'Beast-Warrior', 'Dinosaur', 'Fish', 'Sea Serpent',
        'Reptile', 'Psychic', 'Divine-Beast', 'Creator-God', 'Wyrm', 'Cyberse',
        'Illusion'
    ];

    const KNOWN_MODIFIERS = [
        'Normal', 'Effect', 'Fusion', 'Ritual', 'Synchro', 'Xyz', 'Link',
        'Pendulum', 'Tuner', 'Token', 'Flip', 'Spirit', 'Toon', 'Union', 'Gemini'
    ];

    const SPELL_TRAP_SUBTYPES = ['Quick-Play', 'Field', 'Equip', 'Continuous', 'Counter'];

    // Everything we scan for in card descriptions
    const ALL_KNOWN_TYPES = [
        ...KNOWN_RACES, ...KNOWN_MODIFIERS,
        'Spell', 'Trap', ...SPELL_TRAP_SUBTYPES
    ];

    // Pre-compiled regexes (word-boundary) for each known type/attribute
    const TYPE_PATTERNS  = ALL_KNOWN_TYPES .map(t => ({ t, re: new RegExp(`\\b${escapeRegex(t)}\\b`) }));
    const ATTR_PATTERNS  = KNOWN_ATTRIBUTES.map(a => ({ a, re: new RegExp(`\\b${a}\\b`) }));

    /* ------------------------------------------------------------------ */
    /*  Persistent cache                                                    */
    /* ------------------------------------------------------------------ */

    let _relCache = null;   // { [cardId]: { types, attributes, mentionNames } }

    function loadRelCache() {
        if (_relCache !== null) return _relCache;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            _relCache = raw ? JSON.parse(raw) : {};
        } catch {
            _relCache = {};
        }
        return _relCache;
    }

    function saveRelCache() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_relCache));
        } catch (e) {
            console.warn('CardRelations: could not persist cache —', e.message);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  In-memory indexes (rebuilt lazily, invalidated on cache change)    */
    /* ------------------------------------------------------------------ */

    let _nameIndex    = null;  // { [cardName]: cardId }
    let _reverseIndex = null;  // { [mentionedCardId]: cardId[] } — who mentions it

    /** Name → ID map built from current CardDatabase contents. */
    function getNameIndex() {
        if (_nameIndex) return _nameIndex;
        _nameIndex = {};
        CardDatabase.getAllCards().forEach(c => {
            if (c.name) _nameIndex[c.name] = c.id;
        });
        return _nameIndex;
    }

    /**
     * Reverse mention index.
     * Built by resolving every cached card's mentionNames against the current DB.
     */
    function getReverseIndex() {
        if (_reverseIndex) return _reverseIndex;

        const cache  = loadRelCache();
        const nameIx = getNameIndex();
        _reverseIndex = {};

        for (const [rawId, rel] of Object.entries(cache)) {
            const fromId = parseInt(rawId);
            rel.mentionNames.forEach(name => {
                const toId = nameIx[name];
                if (toId === undefined) return;
                if (!_reverseIndex[toId]) _reverseIndex[toId] = [];
                if (!_reverseIndex[toId].includes(fromId)) _reverseIndex[toId].push(fromId);
            });
        }

        return _reverseIndex;
    }

    /** Invalidate in-memory derived indexes (call after any cache mutation). */
    function invalidateIndexes() {
        _reverseIndex = null;
        _nameIndex    = null;
    }

    /* ------------------------------------------------------------------ */
    /*  Core computation                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Compute (and persistently cache) the `related` field for a card.
     * Safe to call many times — returns the cached result if available.
     *
     * @param {Object} card - Full card object (needs .desc, .type, .attribute, .race)
     * @returns {{ types: string[], attributes: string[], mentionNames: string[] }}
     */
    function computeRelated(card) {
        const cache = loadRelCache();
        if (cache[card.id]) return cache[card.id];

        const rel = {
            types:        extractTypes(card),
            attributes:   extractAttributes(card),
            mentionNames: extractMentionNames(card)
        };

        cache[card.id] = rel;
        saveRelCache();
        invalidateIndexes();
        return rel;
    }

    /** Alias for computeRelated — same behaviour. */
    const getRelated = computeRelated;

    /** True if this card's relations have already been computed. */
    function hasRelated(cardId) {
        return !!loadRelCache()[cardId];
    }

    /* ------------------------------------------------------------------ */
    /*  Related-card lookup                                                 */
    /* ------------------------------------------------------------------ */

    /**
     * Get all cards related to `cardId`.
     *
     * - byType / byAttribute: flat depth-1 match against the local DB.
     *   (These would produce thousands of results at deeper depths.)
     * - mentioned / mentionedBy: follows the mention chain up to `depth` hops.
     *
     * @param {number}  cardId
     * @param {number}  depth  - Recursion depth for mention traversal (default 1)
     * @returns {{ byType: number[], byAttribute: number[], mentioned: number[], mentionedBy: number[] }}
     */
    function getRelatedCards(cardId, depth = 1) {
        const card = CardDatabase.getCard(cardId);
        if (!card) return { byType: [], byAttribute: [], mentioned: [], mentionedBy: [] };

        const rel = computeRelated(card);

        return {
            byType:      findByTypes(rel.types).filter(id => id !== cardId),
            byAttribute: findByAttributes(rel.attributes).filter(id => id !== cardId),
            mentioned:   [...collectMentionChain   (cardId, depth, new Set([cardId]))],
            mentionedBy: [...collectReverseMentionChain(cardId, depth, new Set([cardId]))]
        };
    }

    /** BFS forward through the mention graph. */
    function collectMentionChain(cardId, depth, visited) {
        if (depth === 0) return new Set();

        const card = CardDatabase.getCard(cardId);
        if (!card) return new Set();

        const rel      = computeRelated(card);
        const nameIndex = getNameIndex();
        const result   = new Set();

        rel.mentionNames.forEach(name => {
            const id = nameIndex[name];
            if (id === undefined || visited.has(id)) return;
            result.add(id);
            visited.add(id);
            if (depth > 1) {
                collectMentionChain(id, depth - 1, visited).forEach(deeper => result.add(deeper));
            }
        });

        return result;
    }

    /** BFS backward through the reverse mention graph. */
    function collectReverseMentionChain(cardId, depth, visited) {
        if (depth === 0) return new Set();

        const rev    = getReverseIndex();
        const fromIds = rev[cardId] || [];
        const result  = new Set();

        fromIds.forEach(id => {
            if (visited.has(id)) return;
            result.add(id);
            visited.add(id);
            if (depth > 1) {
                collectReverseMentionChain(id, depth - 1, visited).forEach(deeper => result.add(deeper));
            }
        });

        return result;
    }

    /* ------------------------------------------------------------------ */
    /*  Extraction helpers (run once per card, result persisted)           */
    /* ------------------------------------------------------------------ */

    function extractTypes(card) {
        const types = new Set();

        // Tokens from the compound type string (e.g. "Synchro/Effect Monster")
        if (card.type) {
            card.type.split(/[\s\/]+/).forEach(t => {
                const clean = t.trim();
                if (clean && clean !== 'Card' && clean !== 'Monster') types.add(clean);
            });
        }

        // Monster race / spell-trap subtype
        if (card.race) types.add(card.race);

        // Types mentioned by name in the card description
        if (card.desc) {
            TYPE_PATTERNS.forEach(({ t, re }) => {
                if (re.test(card.desc)) types.add(t);
            });
        }

        return [...types];
    }

    function extractAttributes(card) {
        const attrs = new Set();

        if (card.attribute) attrs.add(card.attribute);

        if (card.desc) {
            ATTR_PATTERNS.forEach(({ a, re }) => {
                if (re.test(card.desc)) attrs.add(a);
            });
        }

        return [...attrs];
    }

    /**
     * Returns raw quoted strings found in the description —
     * stored as names, not IDs, so new DB entries are picked up automatically.
     */
    function extractMentionNames(card) {
        if (!card.desc) return [];

        const seen  = new Set();
        const names = [];
        const re    = /"([^"]+)"/g;
        let m;

        while ((m = re.exec(card.desc)) !== null) {
            const name = m[1];
            if (!seen.has(name)) {
                seen.add(name);
                names.push(name);
            }
        }

        return names;
    }

    /* ------------------------------------------------------------------ */
    /*  DB scan helpers                                                     */
    /* ------------------------------------------------------------------ */

    function findByTypes(types) {
        if (!types.length) return [];
        return CardDatabase.getAllCards()
            .filter(c => types.some(t => c.type?.includes(t) || c.race === t))
            .map(c => c.id);
    }

    function findByAttributes(attrs) {
        if (!attrs.length) return [];
        return CardDatabase.getAllCards()
            .filter(c => attrs.includes(c.attribute))
            .map(c => c.id);
    }

    /* ------------------------------------------------------------------ */
    /*  Cache management                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Drop the cached relations for one card (e.g. if its data was updated).
     */
    function invalidateCard(cardId) {
        const cache = loadRelCache();
        if (cache[cardId]) {
            delete cache[cardId];
            saveRelCache();
            invalidateIndexes();
        }
    }

    /**
     * Wipe the entire relations cache and all in-memory indexes.
     * The next access for any card will recompute from scratch.
     */
    function clearCache() {
        _relCache     = {};
        _reverseIndex = null;
        _nameIndex    = null;
        localStorage.removeItem(STORAGE_KEY);
    }

    /**
     * Invalidate the in-memory name / reverse indexes
     * (call this whenever new cards are added to CardDatabase).
     */
    function notifyDatabaseChanged() {
        invalidateIndexes();
    }

    /** Diagnostic stats. */
    function getStats() {
        const cache = loadRelCache();
        const raw   = localStorage.getItem(STORAGE_KEY);
        return {
            computed:     Object.keys(cache).length,
            storageBytes: raw ? raw.length : 0
        };
    }

    /* ------------------------------------------------------------------ */

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* ------------------------------------------------------------------ */

    return {
        computeRelated,
        getRelated,
        hasRelated,
        getRelatedCards,
        invalidateCard,
        clearCache,
        notifyDatabaseChanged,
        getStats
    };
})();
