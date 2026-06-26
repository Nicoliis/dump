/**
 * Import Handler Module - Manages all import/export operations
 * Consolidates bulk, YDK, CSV, and collection imports
 */

const ImportHandler = (() => {
    /**
     * Handle bulk card import from text input
     * @param {string} cardNames - Newline-separated card names
     * @param {string} destination - 'collection' or 'deck'
     * @param {Array} selectedGroups - Selected group indices (for deck)
     * @returns {Promise<Object>} Result { success, added, failed }
     */
    async function handleBulkImport(cardNames, destination = 'collection', selectedGroups = [0]) {
        const names = cardNames.split('\n').map(n => n.trim()).filter(n => n);
        let added = 0;
        let failed = 0;

        for (const name of names) {
            try {
                const cards = await CardAPI.searchCardsByName(name);
                if (cards.length > 0) {
                    const card = cards[0];

                    if (destination === 'collection') {
                        CollectionManager.add(card.id);
                    } else if (destination === 'deck') {
                        const groupIndex = selectedGroups[0] || 0;
                        const result = DeckManager.addCard(card.id, groupIndex);
                        if (!result.success) {
                            failed++;
                            continue;
                        }
                    }

                    added++;
                } else {
                    failed++;
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {
                failed++;
                console.error('Error importing card:', name, e);
            }
        }

        return { success: added > 0, added, failed };
    }

    /**
     * Handle YDK file import
     * @param {File} file - YDK file
     * @param {string} destination - 'collection' or 'deck'
     * @param {Array} selectedGroups - Selected group indices (for deck)
     * @returns {Promise<Object>} Result { success, added }
     */
    async function handleYDKImport(file, destination = 'collection', selectedGroups = [0, 1, 2]) {
        try {
            const content = await file.text();
            const ydkResult = DeckManager.importFromYDK(content);

            if (!ydkResult.success) {
                return { success: false, added: 0 };
            }

            let added = 0;

            if (destination === 'collection') {
                ydkResult.groups.forEach(group => {
                    group.cards.forEach(cardId => {
                        CollectionManager.add(cardId);
                        added++;
                    });
                });
            } else if (destination === 'deck') {
                DeckManager.loadGroups(ydkResult.groups);
                added = ydkResult.groups.reduce((sum, g) => sum + g.cards.length, 0);
            }

            return { success: true, added };
        } catch (e) {
            console.error('YDK import error:', e);
            return { success: false, added: 0 };
        }
    }

    /**
     * Handle CSV file import
     * @param {File} file - CSV file
     * @param {string} destination - 'collection' or 'deck'
     * @param {Array} selectedGroups - Selected group indices (for deck)
     * @returns {Promise<Object>} Result { success, added, failed }
     */
    async function handleCSVImport(file, destination = 'collection', selectedGroups = [0]) {
        try {
            const content = await file.text();
            const lines = content.split(/\r\n|\n|\r/).map(l => l.trim()).filter(l => l);

            let added = 0;
            let failed = 0;

            for (let i = 1; i < lines.length; i++) {
                try {
                    const parts = lines[i].split(',').map(p => p.trim());
                    if (parts.length < 8) continue;

                    const [cardname, cardq, , , , , cardid] = parts;
                    const id = parseInt(cardid);
                    const quantity = parseInt(cardq) || 1;

                    if (!isNaN(id)) {
                        if (destination === 'collection') {
                            for (let j = 0; j < quantity; j++) {
                                CollectionManager.add(id);
                            }
                        } else if (destination === 'deck') {
                            for (let j = 0; j < quantity; j++) {
                                const groupIndex = selectedGroups[0] || 0;
                                DeckManager.addCard(id, groupIndex);
                            }
                        }
                        added++;
                    }
                } catch (e) {
                    failed++;
                }
            }

            return { success: added > 0, added, failed };
        } catch (e) {
            console.error('CSV import error:', e);
            return { success: false, added: 0, failed: 0 };
        }
    }

    /**
     * Handle collection JSON import
     * @param {File} file - JSON file
     * @returns {Promise<Object>} Result { success, added }
     */
    async function handleCollectionImport(file) {
        try {
            const content = await file.text();
            const result = CollectionManager.importFromJSON(content);

            if (!result.success) {
                return { success: false, added: 0 };
            }

            CollectionManager.merge(result.collection);
            const added = Object.values(result.collection).reduce((sum, count) => sum + count, 0);

            return { success: true, added };
        } catch (e) {
            console.error('Collection import error:', e);
            return { success: false, added: 0 };
        }
    }

    /**
     * Export deck as YDK file
     */
    function exportDeckYDK() {
        DeckUI.exportDeckAsYDK();
    }

    /**
     * Export collection as JSON file
     */
    function exportCollectionJSON() {
        CollectionUI.exportAsJSON();
    }

    return {
        handleBulkImport,
        handleYDKImport,
        handleCSVImport,
        handleCollectionImport,
        exportDeckYDK,
        exportCollectionJSON
    };
})();
