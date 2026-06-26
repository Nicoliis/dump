/**
 * Card Database Module
 * 
 * Provides persistent local storage for card data fetched from the API.
 * This prevents repeated API calls and respects rate limits.
 * 
 * Features:
 * - Caches individual cards by ID
 * - Full-text search across cached cards
 * - Tracks cache metadata (fetch time, count)
 * - Export/import database
 * - Clear old cache entries
 */

const CardDatabase = (() => {
    const STORAGE_KEY = 'ygoCardDatabase';
    const CACHE_KEY = 'ygoCardCache';
    const MAX_CACHE_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    
    // ===== PRIVATE SECTION =====
    
    /**
     * Get the entire database from storage
     * @returns {Object} Database object
     */
    function getDatabase() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return { cards: {}, metadata: { lastUpdated: Date.now(), count: 0 } };
        }
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Card database corrupted, resetting:', e);
            localStorage.removeItem(STORAGE_KEY);
            return { cards: {}, metadata: { lastUpdated: Date.now(), count: 0 } };
        }
    }
    
    /**
     * Save database to storage
     * @param {Object} database - Database object
     */
    function saveDatabase(database) {
        try {
            database.metadata.lastUpdated = Date.now();
            database.metadata.count = Object.keys(database.cards).length;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
        } catch (e) {
            console.error('Failed to save card database:', e);
            if (e.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded. Clearing old entries...');
                clearOldEntries();
            }
        }
    }
    
    /**
     * Remove entries older than MAX_CACHE_AGE
     */
    function clearOldEntries() {
        const db = getDatabase();
        const now = Date.now();
        let removed = 0;
        
        for (const cardId in db.cards) {
            const card = db.cards[cardId];
            if (card.cachedAt && (now - card.cachedAt) > MAX_CACHE_AGE) {
                delete db.cards[cardId];
                removed++;
            }
        }
        
        if (removed > 0) {
            saveDatabase(db);
            console.log(`Cleared ${removed} old card entries from database`);
        }
    }
    
    /**
     * Normalize card data to ensure consistency
     * @param {Object} card - Raw card from API
     * @returns {Object} Normalized card with cache metadata
     */
    function normalizeCard(card) {
        return {
            ...card,
            cachedAt: Date.now(),
            searchText: `${card.name || ''} ${card.archetype || ''} ${card.type || ''}`.toLowerCase()
        };
    }
    
    /**
     * Matches a card against search query
     * @param {Object} card - Card object
     * @param {string} query - Search query (lowercase)
     * @returns {boolean} True if matches
     */
    function matches(card, query) {
        if (!card.searchText) return false;
        return card.searchText.includes(query);
    }
    
    // ===== PUBLIC API =====
    
    return {
        /**
         * Get a single card by ID from database
         * @param {number} cardId - Card ID
         * @returns {Object|null} Card object or null if not cached
         */
        getCard(cardId) {
            const db = getDatabase();
            return db.cards[cardId] || null;
        },
        
        /**
         * Check if card exists in database
         * @param {number} cardId - Card ID
         * @returns {boolean} True if cached
         */
        hasCard(cardId) {
            return this.getCard(cardId) !== null;
        },
        
        /**
         * Save a single card to database
         * @param {Object} card - Card object from API
         */
        addCard(card) {
            if (!card || !card.id) return;
            const db = getDatabase();
            db.cards[card.id] = normalizeCard(card);
            saveDatabase(db);
            // Invalidate CardRelations name/reverse indexes so new card is visible
            if (typeof CardRelations !== 'undefined') CardRelations.notifyDatabaseChanged();
        },

        /**
         * Save multiple cards to database (more efficient than individual adds)
         * @param {Array} cards - Array of card objects
         */
        addCards(cards) {
            if (!Array.isArray(cards)) return;
            const db = getDatabase();

            cards.forEach(card => {
                if (card && card.id) {
                    db.cards[card.id] = normalizeCard(card);
                }
            });

            saveDatabase(db);
            console.log(`Added/updated ${cards.length} cards in database`);
            // Invalidate CardRelations name/reverse indexes so new cards are visible
            if (typeof CardRelations !== 'undefined') CardRelations.notifyDatabaseChanged();
        },
        
        /**
         * Search database for cards matching query
         * @param {string} query - Search query (name, archetype, type)
         * @returns {Array} Matching cards sorted by name
         */
        searchCards(query) {
            const db = getDatabase();
            const queryLower = query.toLowerCase();
            
            return Object.values(db.cards)
                .filter(card => matches(card, queryLower))
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        },
        
        /**
         * Get all cards in database
         * @returns {Array} All cached cards
         */
        getAllCards() {
            const db = getDatabase();
            return Object.values(db.cards);
        },
        
        /**
         * Get database statistics
         * @returns {Object} Stats object
         */
        getStats() {
            const db = getDatabase();
            const cards = Object.values(db.cards);
            const now = Date.now();
            const oldestCard = Math.max(
                ...cards.map(c => now - (c.cachedAt || 0))
            );
            
            return {
                totalCards: cards.length,
                lastUpdated: new Date(db.metadata.lastUpdated).toLocaleString(),
                oldestEntry: Math.round(oldestCard / (1000 * 60 * 60 * 24)) + ' days ago',
                storageSize: localStorage.getItem(STORAGE_KEY)?.length || 0
            };
        },
        
        /**
         * Clear entire database
         */
        clear() {
            localStorage.removeItem(STORAGE_KEY);
            console.log('Card database cleared');
        },
        
        /**
         * Export database as JSON string
         * @returns {string} JSON export
         */
        export() {
            const db = getDatabase();
            return JSON.stringify(db, null, 2);
        },
        
        /**
         * Import database from JSON string
         * @param {string} jsonData - JSON string
         * @returns {boolean} Success
         */
        import(jsonData) {
            try {
                const data = JSON.parse(jsonData);
                if (!data.cards || typeof data.cards !== 'object') {
                    throw new Error('Invalid database format');
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                console.log(`Imported ${Object.keys(data.cards).length} cards into database`);
                return true;
            } catch (e) {
                console.error('Failed to import database:', e);
                return false;
            }
        },
        
        /**
         * Get cards by archetype
         * @param {string} archetype - Archetype name
         * @returns {Array} Matching cards
         */
        getByArchetype(archetype) {
            const db = getDatabase();
            return Object.values(db.cards).filter(
                card => card.archetype && card.archetype.toLowerCase() === archetype.toLowerCase()
            );
        },
        
        /**
         * Get cards by type
         * @param {string} type - Card type
         * @returns {Array} Matching cards
         */
        getByType(type) {
            const db = getDatabase();
            return Object.values(db.cards).filter(
                card => card.type && card.type.toLowerCase() === type.toLowerCase()
            );
        },
        
        /**
         * Cleanup old cache entries (older than MAX_CACHE_AGE)
         * @returns {number} Number of entries removed
         */
        cleanup() {
            const db = getDatabase();
            const now = Date.now();
            const before = Object.keys(db.cards).length;
            
            for (const cardId in db.cards) {
                const card = db.cards[cardId];
                if (card.cachedAt && (now - card.cachedAt) > MAX_CACHE_AGE) {
                    delete db.cards[cardId];
                }
            }
            
            const removed = before - Object.keys(db.cards).length;
            if (removed > 0) {
                saveDatabase(db);
            }
            
            return removed;
        }
    };
})();
