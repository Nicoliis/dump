/**
 * Storage Module - Handles all localStorage persistence
 * Manages: deck, collection, combos, and settings
 */

const Storage = (() => {
    const KEYS = {
        DECK: 'ygoDeck',
        COLLECTION: 'ygoCollection',
        COMBOS: 'ygoCombos'
    };

    /**
     * Load all data from localStorage
     * @returns {Object} Data object with deck, collection, combos
     */
    function loadAll() {
        return {
            deck: loadDeck(),
            collection: loadCollection(),
            combos: loadCombos()
        };
    }

    /**
     * Load deck from localStorage with backward compatibility
     * @returns {Object} Deck object with groups array
     */
    function loadDeck() {
        const saved = localStorage.getItem(KEYS.DECK);
        if (!saved) {
            return createDefaultDeck();
        }

        try {
            const parsed = JSON.parse(saved);
            // Backward compatibility: convert old format to new format
            if (parsed.main || parsed.extra || parsed.side) {
                return {
                    groups: [
                        { name: 'Main Deck', cards: parsed.main || [], expanded: true },
                        { name: 'Extra Deck', cards: parsed.extra || [], expanded: true },
                        { name: 'Side Deck', cards: parsed.side || [], expanded: true }
                    ]
                };
            }
            return parsed;
        } catch (e) {
            console.error('Failed to parse saved deck:', e);
            return createDefaultDeck();
        }
    }

    /**
     * Load collection from localStorage
     * @returns {Object} Collection object with cardId: count mapping
     */
    function loadCollection() {
        const saved = localStorage.getItem(KEYS.COLLECTION);
        if (!saved) return {};

        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse saved collection:', e);
            return {};
        }
    }

    /**
     * Load combos from localStorage
     * @returns {Array} Array of combo objects
     */
    function loadCombos() {
        const saved = localStorage.getItem(KEYS.COMBOS);
        if (!saved) return [];

        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse saved combos:', e);
            return [];
        }
    }

    /**
     * Save deck to localStorage
     * @param {Object} deck - Deck object to save
     */
    function saveDeck(deck) {
        try {
            localStorage.setItem(KEYS.DECK, JSON.stringify(deck));
        } catch (e) {
            console.error('Failed to save deck:', e);
        }
    }

    /**
     * Save collection to localStorage
     * @param {Object} collection - Collection object to save
     */
    function saveCollection(collection) {
        try {
            localStorage.setItem(KEYS.COLLECTION, JSON.stringify(collection));
        } catch (e) {
            console.error('Failed to save collection:', e);
        }
    }

    /**
     * Save combos to localStorage
     * @param {Array} combos - Combos array to save
     */
    function saveCombos(combos) {
        try {
            localStorage.setItem(KEYS.COMBOS, JSON.stringify(combos));
        } catch (e) {
            console.error('Failed to save combos:', e);
        }
    }

    /**
     * Save all data to localStorage
     * @param {Object} data - Data object with deck, collection, combos
     */
    function saveAll(data) {
        saveDeck(data.deck);
        saveCollection(data.collection);
        saveCombos(data.combos);
    }

    /**
     * Clear all data from localStorage
     */
    function clearAll() {
        localStorage.removeItem(KEYS.DECK);
        localStorage.removeItem(KEYS.COLLECTION);
        localStorage.removeItem(KEYS.COMBOS);
    }

    /**
     * Create default deck structure
     * @returns {Object} Default deck with Main, Extra, Side decks
     */
    function createDefaultDeck() {
        return {
            groups: [
                { name: 'Main Deck', cards: [], expanded: true },
                { name: 'Extra Deck', cards: [], expanded: true },
                { name: 'Side Deck', cards: [], expanded: true }
            ]
        };
    }

    return {
        loadAll,
        loadDeck,
        loadCollection,
        loadCombos,
        saveDeck,
        saveCollection,
        saveCombos,
        saveAll,
        clearAll,
        createDefaultDeck
    };
})();
