/**
 * State Module - Centralized state management
 * Manages: deck, collection, combos, UI state
 */

const AppState = (() => {
    let state = {
        deck: Storage.createDefaultDeck(),
        collection: {},
        combos: [],
        currentTab: 0,
        cardCache: {},
        hoverTooltip: null,
        draggedCard: null,
        draggedFromGroup: null,
        groupPages: {},
        collectionPage: 0,
        filteredCollectionCards: null
    };

    /**
     * Initialize state from storage
     */
    function initialize() {
        const loaded = Storage.loadAll();
        state.deck = loaded.deck;
        state.collection = loaded.collection;
        state.combos = loaded.combos;
        
        // Initialize group pagination
        state.groupPages = {};
        state.deck.groups.forEach((_, index) => {
            state.groupPages[index] = 0;
        });
    }

    /**
     * Get current state
     * @returns {Object} Current state object
     */
    function getState() {
        return { ...state };
    }

    /**
     * Get specific state property
     * @param {string} key - Property key
     * @returns {*} Property value
     */
    function get(key) {
        return state[key];
    }

    /**
     * Set specific state property
     * @param {string} key - Property key
     * @param {*} value - New value
     */
    function set(key, value) {
        state[key] = value;
    }

    /**
     * Update deck and save
     * @param {Object} newDeck - New deck object
     */
    function updateDeck(newDeck) {
        state.deck = newDeck;
        Storage.saveDeck(newDeck);
    }

    /**
     * Update collection and save
     * @param {Object} newCollection - New collection object
     */
    function updateCollection(newCollection) {
        state.collection = newCollection;
        Storage.saveCollection(newCollection);
    }

    /**
     * Update combos and save
     * @param {Array} newCombos - New combos array
     */
    function updateCombos(newCombos) {
        state.combos = newCombos;
        Storage.saveCombos(newCombos);
    }

    /**
     * Add card to a deck group
     * @param {number} cardId - Card ID
     * @param {number} groupIndex - Group index
     * @returns {boolean} Success flag
     */
    function addCardToGroup(cardId, groupIndex) {
        if (groupIndex < 0 || groupIndex >= state.deck.groups.length) {
            return false;
        }

        const group = state.deck.groups[groupIndex];
        const countInGroup = group.cards.filter(id => id === cardId).length;
        const max = group.name.toLowerCase().includes('extra') ? 1 : 3;

        if (countInGroup >= max) {
            return false;
        }

        group.cards.push(cardId);
        updateDeck(state.deck);
        return true;
    }

    /**
     * Remove card from a deck group
     * @param {number} cardId - Card ID
     * @param {number} groupIndex - Group index
     * @returns {boolean} Success flag
     */
    function removeCardFromGroup(cardId, groupIndex) {
        if (groupIndex < 0 || groupIndex >= state.deck.groups.length) {
            return false;
        }

        const group = state.deck.groups[groupIndex];
        const index = group.cards.indexOf(cardId);

        if (index > -1) {
            group.cards.splice(index, 1);
            updateDeck(state.deck);
            return true;
        }

        return false;
    }

    /**
     * Add collection item
     * @param {number} cardId - Card ID
     */
    function addToCollection(cardId) {
        if (!state.collection[cardId]) {
            state.collection[cardId] = 0;
        }
        state.collection[cardId]++;
        updateCollection(state.collection);
    }

    /**
     * Remove collection item
     * @param {number} cardId - Card ID
     */
    function removeFromCollection(cardId) {
        if (state.collection[cardId]) {
            state.collection[cardId]--;
            if (state.collection[cardId] <= 0) {
                delete state.collection[cardId];
            }
            updateCollection(state.collection);
        }
    }

    /**
     * Set collection quantity
     * @param {number} cardId - Card ID
     * @param {number} quantity - New quantity
     */
    function setCollectionQuantity(cardId, quantity) {
        if (quantity <= 0) {
            delete state.collection[cardId];
        } else {
            state.collection[cardId] = quantity;
        }
        updateCollection(state.collection);
    }

    /**
     * Clear entire collection
     */
    function clearCollection() {
        state.collection = {};
        updateCollection(state.collection);
    }

    /**
     * Get deck statistics
     * @returns {Object} Deck stats
     */
    function getDeckStats() {
        let totalCards = 0;
        const archetypes = {};

        state.deck.groups.forEach(group => {
            totalCards += group.cards.length;
        });

        return {
            totalCards,
            uniqueCards: state.deck.groups.reduce((acc, g) => 
                acc + new Set(g.cards).size, 0),
            groupCount: state.deck.groups.length
        };
    }

    /**
     * Get collection statistics
     * @returns {Object} Collection stats
     */
    function getCollectionStats() {
        const totalCards = Object.values(state.collection).reduce((sum, count) => sum + count, 0);
        const uniqueCards = Object.keys(state.collection).length;

        return {
            totalCards,
            uniqueCards
        };
    }

    return {
        initialize,
        getState,
        get,
        set,
        updateDeck,
        updateCollection,
        updateCombos,
        addCardToGroup,
        removeCardFromGroup,
        addToCollection,
        removeFromCollection,
        setCollectionQuantity,
        clearCollection,
        getDeckStats,
        getCollectionStats
    };
})();
