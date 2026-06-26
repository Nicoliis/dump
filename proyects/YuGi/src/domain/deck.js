/**
 * Deck Domain Module - All deck-related business logic
 * Manages deck groups, cards, and deck operations
 */

const DeckManager = (() => {
    const MAX_MAIN_DECK_COPIES = 3;
    const MAX_EXTRA_DECK_COPIES = 1;
    const MAX_SIDE_DECK_COPIES = 3;

    /**
     * Add card to a deck group
     * @param {number} cardId - Card ID
     * @param {number} groupIndex - Group index
     * @returns {Object} Result { success, message }
     */
    function addCard(cardId, groupIndex = null) {
        if (groupIndex === null) {
            groupIndex = AppState.get('currentTab');
        }

        const result = AppState.addCardToGroup(cardId, groupIndex);
        
        if (!result) {
            const group = AppState.get('deck').groups[groupIndex];
            const max = group.name.toLowerCase().includes('extra') 
                ? MAX_EXTRA_DECK_COPIES 
                : MAX_MAIN_DECK_COPIES;
            
            return {
                success: false,
                message: `Maximum ${max} copies allowed in ${group.name}`
            };
        }

        return {
            success: true,
            message: `Card added to ${AppState.get('deck').groups[groupIndex].name}`
        };
    }

    /**
     * Remove card from a deck group
     * @param {number} cardId - Card ID
     * @param {number} groupIndex - Group index
     * @returns {boolean} Success flag
     */
    function removeCard(cardId, groupIndex) {
        return AppState.removeCardFromGroup(cardId, groupIndex);
    }

    /**
     * Create new deck group
     * @param {string} name - Group name
     * @returns {boolean} Success flag
     */
    function createGroup(name) {
        if (!name || name.trim() === '') return false;

        const deck = AppState.get('deck');
        deck.groups.push({
            name: name.trim(),
            cards: [],
            expanded: true
        });

        AppState.updateDeck(deck);
        return true;
    }

    /**
     * Rename deck group
     * @param {number} groupIndex - Group index
     * @param {string} newName - New name
     * @returns {boolean} Success flag
     */
    function renameGroup(groupIndex, newName) {
        const deck = AppState.get('deck');
        
        if (groupIndex < 0 || groupIndex >= deck.groups.length) return false;
        if (!newName || newName.trim() === '') return false;

        deck.groups[groupIndex].name = newName.trim();
        AppState.updateDeck(deck);
        return true;
    }

    /**
     * Delete deck group
     * @param {number} groupIndex - Group index
     * @returns {boolean} Success flag
     */
    function deleteGroup(groupIndex) {
        const deck = AppState.get('deck');

        if (groupIndex < 0 || groupIndex >= deck.groups.length) return false;
        if (deck.groups.length <= 1) return false;

        deck.groups.splice(groupIndex, 1);
        AppState.updateDeck(deck);
        return true;
    }

    /**
     * Toggle group expanded state
     * @param {number} groupIndex - Group index
     */
    function toggleGroupExpanded(groupIndex) {
        const deck = AppState.get('deck');
        
        if (groupIndex < 0 || groupIndex >= deck.groups.length) return;

        deck.groups[groupIndex].expanded = !deck.groups[groupIndex].expanded;
        AppState.updateDeck(deck);
    }

    /**
     * Move card between groups
     * @param {number} cardId - Card ID
     * @param {number} fromGroupIndex - Source group
     * @param {number} toGroupIndex - Target group
     * @returns {boolean} Success flag
     */
    function moveCard(cardId, fromGroupIndex, toGroupIndex) {
        if (fromGroupIndex === toGroupIndex) return false;

        if (!removeCard(cardId, fromGroupIndex)) return false;
        
        const result = addCard(cardId, toGroupIndex);
        if (!result.success) {
            // Restore card if add failed
            addCard(cardId, fromGroupIndex);
            return false;
        }

        return true;
    }

    /**
     * Get deck group
     * @param {number} groupIndex - Group index
     * @returns {Object|null} Group object
     */
    function getGroup(groupIndex) {
        const deck = AppState.get('deck');
        return deck.groups[groupIndex] || null;
    }

    /**
     * Get all deck groups
     * @returns {Array} Groups array
     */
    function getAllGroups() {
        return AppState.get('deck').groups;
    }

    /**
     * Get group card count
     * @param {number} groupIndex - Group index
     * @returns {number} Card count
     */
    function getGroupCardCount(groupIndex) {
        const group = getGroup(groupIndex);
        return group ? group.cards.length : 0;
    }

    /**
     * Get all cards in deck
     * @returns {Array} Array of card IDs
     */
    function getAllCards() {
        return AppState.get('deck').groups.flatMap(g => g.cards);
    }

    /**
     * Get deck statistics
     * @returns {Object} Deck stats
     */
    function getStats() {
        return AppState.getDeckStats();
    }

    /**
     * Clear entire deck
     * @returns {boolean} Success flag
     */
    function clear() {
        const deck = AppState.get('deck');
        deck.groups.forEach(group => {
            group.cards = [];
        });
        AppState.updateDeck(deck);
        return true;
    }

    /**
     * Export deck to YDK format
     * @returns {string} YDK content
     */
    function exportToYDK() {
        let content = '';
        const deck = AppState.get('deck');
        
        deck.groups.forEach(group => {
            content += `#${group.name.replace(/[^a-zA-Z0-9]/g, '_')}\n`;
            group.cards.forEach(id => content += id + '\n');
        });

        return content;
    }

    /**
     * Import deck from YDK format
     * @param {string} ydkContent - YDK content
     * @returns {Object} Result { success, groups }
     */
    function importFromYDK(ydkContent) {
        const lines = ydkContent.split('\n').map(l => l.trim());
        const groups = [];
        let currentGroup = null;

        lines.forEach(line => {
            if (line.startsWith('#')) {
                const groupName = line.substring(1).replace(/_/g, ' ');
                currentGroup = { name: groupName, cards: [], expanded: true };
                groups.push(currentGroup);
            } else if (line && !isNaN(line) && currentGroup) {
                currentGroup.cards.push(parseInt(line));
            }
        });

        // Fallback to legacy format if no groups found
        if (groups.length === 0) {
            groups.push(
                { name: 'Main Deck', cards: [], expanded: true },
                { name: 'Extra Deck', cards: [], expanded: true },
                { name: 'Side Deck', cards: [], expanded: true }
            );

            let section = 'main';
            lines.forEach(line => {
                if (line === '#main') section = 'main';
                else if (line === '#extra') section = 'extra';
                else if (line === '#side') section = 'side';
                else if (line && !isNaN(line)) {
                    const groupIndex = section === 'main' ? 0 : section === 'extra' ? 1 : 2;
                    groups[groupIndex].cards.push(parseInt(line));
                }
            });
        }

        return {
            success: groups.length > 0,
            groups
        };
    }

    /**
     * Get total count of a card in the deck across all groups
     * @param {number} cardId - Card ID
     * @returns {number} Total count
     */
    function getCardCount(cardId) {
        return AppState.get('deck').groups.reduce((total, group) => {
            return total + group.cards.filter(id => id === cardId).length;
        }, 0);
    }

    /**
     * Load deck from groups
     * @param {Array} groups - Groups array
     */
    function loadGroups(groups) {
        if (!Array.isArray(groups) || groups.length === 0) return false;

        AppState.updateDeck({ groups });
        return true;
    }

    return {
        addCard,
        removeCard,
        createGroup,
        renameGroup,
        deleteGroup,
        toggleGroupExpanded,
        moveCard,
        getGroup,
        getAllGroups,
        getGroupCardCount,
        getAllCards,
        getStats,
        clear,
        exportToYDK,
        importFromYDK,
        getCardCount,
        loadGroups,
        // Constants
        MAX_MAIN_DECK_COPIES,
        MAX_EXTRA_DECK_COPIES,
        MAX_SIDE_DECK_COPIES
    };
})();
