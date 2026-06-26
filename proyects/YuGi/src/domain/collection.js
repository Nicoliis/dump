/**
 * Collection Domain Module - All collection-related business logic
 * Manages card collection and collection operations
 */

const CollectionManager = (() => {
    /**
     * Add card to collection
     * @param {number} cardId - Card ID
     */
    function add(cardId) {
        AppState.addToCollection(cardId);
    }

    /**
     * Remove card from collection
     * @param {number} cardId - Card ID
     */
    function remove(cardId) {
        AppState.removeFromCollection(cardId);
    }

    /**
     * Set collection quantity
     * @param {number} cardId - Card ID
     * @param {number} quantity - New quantity
     */
    function setQuantity(cardId, quantity) {
        AppState.setCollectionQuantity(cardId, quantity);
    }

    /**
     * Adjust collection quantity
     * @param {number} cardId - Card ID
     * @param {number} delta - Change amount
     */
    function adjust(cardId, delta) {
        const collection = AppState.get('collection');
        const current = collection[cardId] || 0;
        const newQuantity = Math.max(0, current + delta);
        setQuantity(cardId, newQuantity);
    }

    /**
     * Get card quantity in collection
     * @param {number} cardId - Card ID
     * @returns {number} Card quantity
     */
    function getQuantity(cardId) {
        return AppState.get('collection')[cardId] || 0;
    }

    /**
     * Check if card in collection
     * @param {number} cardId - Card ID
     * @returns {boolean} Is in collection
     */
    function has(cardId) {
        return (AppState.get('collection')[cardId] || 0) > 0;
    }

    /**
     * Get all collection cards
     * @returns {Object} Collection object
     */
    function getAll() {
        return { ...AppState.get('collection') };
    }

    /**
     * Get collection statistics
     * @returns {Object} Stats object
     */
    function getStats() {
        return AppState.getCollectionStats();
    }

    /**
     * Clear entire collection
     * @returns {boolean} Success flag
     */
    function clear() {
        AppState.clearCollection();
        return true;
    }

    /**
     * Merge collection with another
     * @param {Object} otherCollection - Collection to merge
     */
    function merge(otherCollection) {
        const current = AppState.get('collection');
        
        Object.entries(otherCollection).forEach(([cardId, quantity]) => {
            current[parseInt(cardId)] = (current[parseInt(cardId)] || 0) + quantity;
        });

        AppState.updateCollection(current);
    }

    /**
     * Export collection as JSON
     * @returns {string} JSON string
     */
    function exportToJSON() {
        return JSON.stringify(AppState.get('collection'), null, 2);
    }

    /**
     * Import collection from JSON
     * @param {string} jsonString - JSON string
     * @returns {Object} Result { success, message, collection }
     */
    function importFromJSON(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            
            if (typeof imported !== 'object' || Array.isArray(imported)) {
                return {
                    success: false,
                    message: 'Invalid collection format'
                };
            }

            // Validate structure
            const collection = {};
            Object.entries(imported).forEach(([id, count]) => {
                const cardId = parseInt(id);
                const quantity = parseInt(count);
                
                if (!isNaN(cardId) && !isNaN(quantity) && quantity > 0) {
                    collection[cardId] = quantity;
                }
            });

            return {
                success: true,
                message: 'Collection imported successfully',
                collection
            };
        } catch (e) {
            return {
                success: false,
                message: `Failed to parse JSON: ${e.message}`
            };
        }
    }

    /**
     * Fetch all collection cards with their details (no filtering)
     * @returns {Promise<Array>} Array of { card, count }
     */
    async function getCollectionCards() {
        const collection = AppState.get('collection');
        const cardIds = Object.keys(collection);
        if (cardIds.length === 0) return [];

        const cards = await Promise.all(
            cardIds.map(async (cardId) => {
                const card = await CardAPI.fetchCardById(parseInt(cardId));
                return card ? { card, count: collection[cardId] } : null;
            })
        );
        return cards.filter(c => c !== null);
    }

    /**
     * Get cards with filters applied
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Filtered and sorted cards
     */
    async function getFilteredCards(filters) {
        const all = await getCollectionCards();
        return all
            .filter(item => matchesFilters(item.card, item.count, filters))
            .sort((a, b) => {
                const primary = compareCards(a, b, filters.sortBy, filters.sortOrder);
                if (primary !== 0 || !filters.sortBy2) return primary;
                return compareCards(a, b, filters.sortBy2, filters.sortOrder);
            });
    }

    /**
     * Check if card matches filters
     * @param {Object} card - Card data
     * @param {number} count - Card count
     * @param {Object} filters - Filter options
     * @returns {boolean} Matches filters
     */
    function matchesFilters(card, count, filters) {
        if (!filters) return true;

        // Name filter
        if (filters.name && !card.name.toLowerCase().includes(filters.name.toLowerCase())) {
            return false;
        }

        // Type token filter — every selected token must match the card's type or race
        if (filters.typeTokens && filters.typeTokens.length > 0) {
            if (!card.type || !filters.typeTokens.every(t =>
                card.type.includes(t) || card.race === t
            )) {
                return false;
            }
        }

        // Race filter
        if (filters.race && card.race !== filters.race) {
            return false;
        }

        // Attribute filter
        if (filters.attribute && card.attribute !== filters.attribute) {
            return false;
        }

        // Archetype filter
        if (filters.archetype && (!card.archetype || 
            !card.archetype.toLowerCase().includes(filters.archetype.toLowerCase()))) {
            return false;
        }

        // Level range
        if (filters.levelRange) {
            const { min, max } = filters.levelRange;
            if (!CardUtils.isInRange(card.level, min, max)) {
                return false;
            }
        }

        // ATK range
        if (filters.atkRange) {
            const { min, max } = filters.atkRange;
            if (!CardUtils.isInRange(card.atk, min, max)) {
                return false;
            }
        }

        // DEF range
        if (filters.defRange) {
            const { min, max } = filters.defRange;
            if (!CardUtils.isInRange(card.def, min, max)) {
                return false;
            }
        }

        // Count range
        if (filters.countRange) {
            const { min, max } = filters.countRange;
            if (!CardUtils.isInRange(count, min, max)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Compare two collection cards for sorting
     * @param {Object} a - First item { card, count }
     * @param {Object} b - Second item { card, count }
     * @param {string} sortBy - Sort property
     * @param {string} order - 'asc' or 'desc'
     * @returns {number} Comparison result
     */
    function compareCards(a, b, sortBy = 'name', order = 'asc') {
        let aVal, bVal;

        switch (sortBy) {
            case 'type':
                aVal = CardUtils.normalizeSortValue(a.card.type);
                bVal = CardUtils.normalizeSortValue(b.card.type);
                break;
            case 'attribute':
                aVal = CardUtils.normalizeSortValue(a.card.attribute);
                bVal = CardUtils.normalizeSortValue(b.card.attribute);
                break;
            case 'race':
                aVal = CardUtils.normalizeSortValue(a.card.race);
                bVal = CardUtils.normalizeSortValue(b.card.race);
                break;
            case 'level':
                aVal = a.card.level || 0;
                bVal = b.card.level || 0;
                break;
            case 'atk':
                aVal = Number.isFinite(a.card.atk) ? a.card.atk : -9999;
                bVal = Number.isFinite(b.card.atk) ? b.card.atk : -9999;
                break;
            case 'def':
                aVal = Number.isFinite(a.card.def) ? a.card.def : -9999;
                bVal = Number.isFinite(b.card.def) ? b.card.def : -9999;
                break;
            case 'count':
                aVal = a.count;
                bVal = b.count;
                break;
            default:
                aVal = CardUtils.normalizeSortValue(a.card.name);
                bVal = CardUtils.normalizeSortValue(b.card.name);
        }

        return CardUtils.compareValues(aVal, bVal, order);
    }

    return {
        add,
        remove,
        setQuantity,
        adjust,
        getQuantity,
        has,
        getAll,
        getStats,
        clear,
        merge,
        exportToJSON,
        importFromJSON,
        getCollectionCards,
        getFilteredCards,
        matchesFilters,
        compareCards
    };
})();
