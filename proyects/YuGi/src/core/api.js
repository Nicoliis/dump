/**
 * API Module - Handles YGOProDeck API interactions
 * Provides methods for fetching and searching cards
 */

const CardAPI = (() => {
    const BASE_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
    const CACHE = {};
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Fetch card data by ID
     * @param {number} cardId - Card ID to fetch
     * @returns {Promise<Object|null>} Card data or null if not found
     */
    async function fetchCardById(cardId) {
        if (!cardId) return null;

        const cacheKey = `card_${cardId}`;
        if (CACHE[cacheKey]) {
            return CACHE[cacheKey].data;
        }

        try {
            const res = await fetch(`${BASE_URL}?id=${cardId}`);
            const data = await res.json();
            
            if (data.data && data.data.length > 0) {
                const cardData = data.data[0];
                // Cache with expiration
                CACHE[cacheKey] = {
                    data: cardData,
                    timestamp: Date.now()
                };
                // Persist to long-term DB (also notifies CardRelations)
                if (typeof CardDatabase !== 'undefined') CardDatabase.addCard(cardData);
                return cardData;
            }
            return null;
        } catch (e) {
            console.error('Error fetching card by ID:', cardId, e);
            return null;
        }
    }

    /**
     * Fetch cards by name (search)
     * @param {string} cardName - Card name to search for
     * @returns {Promise<Array>} Array of matching cards
     */
    async function searchCardsByName(cardName) {
        if (!cardName || cardName.trim() === '') return [];

        const cacheKey = `search_${cardName.toLowerCase()}`;
        if (CACHE[cacheKey]) {
            return CACHE[cacheKey].data;
        }

        try {
            const res = await fetch(`${BASE_URL}?fname=${encodeURIComponent(cardName)}`);
            const data = await res.json();
            
            const cards = (data.data || []).sort((a, b) => 
                a.name.localeCompare(b.name)
            );
            
            // Cache results
            CACHE[cacheKey] = {
                data: cards,
                timestamp: Date.now()
            };

            // Persist to long-term DB (also notifies CardRelations)
            if (typeof CardDatabase !== 'undefined') CardDatabase.addCards(cards);

            return cards;
        } catch (e) {
            console.error('Error searching cards:', cardName, e);
            return [];
        }
    }

    /**
     * Fetch multiple cards by IDs
     * @param {Array<number>} cardIds - Array of card IDs to fetch
     * @returns {Promise<Array>} Array of card objects
     */
    async function fetchMultipleCards(cardIds) {
        const uniqueIds = [...new Set(cardIds)];
        const cards = await Promise.all(
            uniqueIds.map(id => fetchCardById(id))
        );
        return cards.filter(card => card !== null);
    }

    /**
     * Clear cache
     */
    function clearCache() {
        Object.keys(CACHE).forEach(key => delete CACHE[key]);
    }

    /**
     * Clear expired cache entries
     */
    function cleanExpiredCache() {
        const now = Date.now();
        Object.keys(CACHE).forEach(key => {
            if (now - CACHE[key].timestamp > CACHE_DURATION) {
                delete CACHE[key];
            }
        });
    }

    return {
        fetchCardById,
        searchCardsByName,
        fetchMultipleCards,
        clearCache,
        cleanExpiredCache
    };
})();
