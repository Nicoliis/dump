/**
 * Search Domain Module - Card search functionality
 * Handles searching and filtering cards
 */

const SearchManager = (() => {
    /**
     * Search cards by name
     * @param {string} cardName - Card name to search for
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Matching cards
     */
    async function searchByName(cardName, options = {}) {
        const {
            collectionOnly = false,
            sortBy = 'name',
            sortOrder = 'asc'
        } = options;

        if (!cardName || cardName.trim() === '') return [];

        const results = await CardAPI.searchCardsByName(cardName);

        // Filter to collection only if requested
        if (collectionOnly) {
            return results.filter(card => CollectionManager.has(card.id));
        }

        // Sort results
        return CardUtils.sortCards(results, sortBy, sortOrder);
    }

    /**
     * Fetch and enrich search results with collection info
     * @param {Array} cards - Card array
     * @returns {Array} Enriched cards
     */
    function enrichWithCollectionInfo(cards) {
        return cards.map(card => ({
            ...card,
            inCollectionCount: CollectionManager.getQuantity(card.id)
        }));
    }

    /**
     * Fetch and enrich with deck info
     * @param {Array} cards - Card array
     * @returns {Array} Enriched cards
     */
    function enrichWithDeckInfo(cards) {
        const deckCards = DeckManager.getAllCards();
        const deckCounts = {};
        deckCards.forEach(id => {
            deckCounts[id] = (deckCounts[id] || 0) + 1;
        });

        return cards.map(card => ({
            ...card,
            inDeckCount: deckCounts[card.id] || 0
        }));
    }

    /**
     * Get search suggestions
     * @param {string} query - Search query
     * @param {number} limit - Result limit
     * @returns {Promise<Array>} Suggestions
     */
    async function getSuggestions(query, limit = 10) {
        if (!query || query.trim().length < 2) return [];

        const results = await searchByName(query);
        return results.slice(0, limit);
    }

    /**
     * Search with advanced filters
     * @param {Object} filters - Advanced filter options
     * @returns {Promise<Array>} Matching cards
     */
    async function advancedSearch(filters) {
        let cards = [];

        // If card name specified, search by name
        if (filters.cardName && filters.cardName.trim()) {
            cards = await searchByName(filters.cardName);
        } else {
            // Would need to use a more advanced API endpoint for full search
            // For now, return empty as API doesn't support advanced queries
            return [];
        }

        // Apply client-side filters
        return cards.filter(card => matchesAdvancedFilters(card, filters))
            .sort((a, b) => CardUtils.compareValues(
                CardUtils.normalizeSortValue(a[filters.sortBy || 'name']),
                CardUtils.normalizeSortValue(b[filters.sortBy || 'name']),
                filters.sortOrder || 'asc'
            ));
    }

    /**
     * Check if card matches advanced filters
     * @param {Object} card - Card data
     * @param {Object} filters - Filter options
     * @returns {boolean} Matches filters
     */
    function matchesAdvancedFilters(card, filters) {
        if (filters.type && card.type !== filters.type) return false;
        if (filters.attribute && card.attribute !== filters.attribute) return false;
        if (filters.race && card.race !== filters.race) return false;

        if (filters.archetype && (!card.archetype ||
            !card.archetype.toLowerCase().includes(filters.archetype.toLowerCase()))) {
            return false;
        }

        // Level range
        if (filters.levelMin !== undefined && card.level < filters.levelMin) return false;
        if (filters.levelMax !== undefined && card.level > filters.levelMax) return false;

        // ATK range
        if (filters.atkMin !== undefined && card.atk < filters.atkMin) return false;
        if (filters.atkMax !== undefined && card.atk > filters.atkMax) return false;

        // DEF range
        if (filters.defMin !== undefined && card.def < filters.defMin) return false;
        if (filters.defMax !== undefined && card.def > filters.defMax) return false;

        return true;
    }

    return {
        searchByName,
        enrichWithCollectionInfo,
        enrichWithDeckInfo,
        getSuggestions,
        advancedSearch,
        matchesAdvancedFilters
    };
})();
