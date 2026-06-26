/**
 * Search UI Module - Renders search interface and results
 */

const SearchUI = (() => {
    const RESULTS_LIMIT = 50;

    /**
     * Perform search and render results
     * @param {string} containerId - Results container ID
     */
    async function performSearch(containerId = 'searchResults') {
        const query = document.getElementById('searchInput')?.value?.trim() || '';
        const collectionOnly = document.getElementById('collectionOnly')?.checked || false;
        const container = document.getElementById(containerId);

        if (!container) return;

        if (!query) {
            UIUtils.clearElement(container);
            container.innerHTML = '<p>Enter a card name to search.</p>';
            return;
        }

        container.innerHTML = '<p>Searching...</p>';

        try {
            let results = await SearchManager.searchByName(query);

            if (collectionOnly) {
                results = results.filter(card => CollectionManager.has(card.id));
            }

            displaySearchResults(container, results.slice(0, RESULTS_LIMIT));
        } catch (e) {
            container.innerHTML = '<p>Error searching cards. Please try again.</p>';
            console.error('Search error:', e);
        }
    }

    /**
     * Display search results grouped by archetype
     * @param {HTMLElement} container - Results container
     * @param {Array} cards - Cards to display
     */
    function displaySearchResultsGrouped(container, cards) {
        UIUtils.clearElement(container);

        if (cards.length === 0) {
            container.innerHTML = '<p>No cards found.</p>';
            return;
        }

        // Group cards by archetype
        const grouped = {};
        cards.forEach(card => {
            const archetype = card.archetype || 'Generic/Support';
            if (!grouped[archetype]) {
                grouped[archetype] = [];
            }
            grouped[archetype].push(card);
        });

        // Display grouped results
        Object.keys(grouped).sort().forEach(archetype => {
            const archetypeGroup = document.createElement('div');
            archetypeGroup.style.marginBottom = '12px';
            
            const heading = document.createElement('h4');
            heading.textContent = `${archetype} (${grouped[archetype].length})`;
            heading.style.margin = '5px 0';
            heading.style.color = 'var(--primary-blue)';
            heading.style.fontSize = '0.95em';
            archetypeGroup.appendChild(heading);

            grouped[archetype].forEach(card => {
                const inCollection = CollectionManager.getQuantity(card.id);
                
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                cardDiv.draggable = true;
                cardDiv.setAttribute('data-card-id', card.id);
                cardDiv.setAttribute('data-card-data', JSON.stringify({
                    id: card.id,
                    name: card.name,
                    type: card.type,
                    archetype: card.archetype || 'Generic/Support'
                }));

                cardDiv.addEventListener('dragstart', (e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('application/json', JSON.stringify({
                        id: card.id,
                        name: card.name,
                        type: card.type,
                        archetype: card.archetype || 'Generic/Support'
                    }));
                });

                cardDiv.addEventListener('mouseenter', (e) => {
                    UIUtils.showCardTooltip(card, e.clientX, e.clientY);
                });

                cardDiv.addEventListener('mousemove', (e) => {
                    UIUtils.updateTooltipPosition(e.clientX, e.clientY);
                });

                cardDiv.addEventListener('mouseleave', () => {
                    UIUtils.hideCardTooltip();
                });

                cardDiv.addEventListener('click', () => CardModalUI.show(card.id));

                const imageUrl = CardUtils.getCardImageUrl(card);
                cardDiv.innerHTML = `
                    <img src="${imageUrl}" alt="${card.name}" style="cursor: pointer;" onerror="this.src='https://via.placeholder.com/90x126?text=?'" title="${card.name}">
                    <div class="card-buttons">
                        <button class="card-button" onclick="event.stopImmediatePropagation(); DeckManager.addCard(${card.id}); DeckUI.renderDeck();" style="background: #2196F3;">+D</button>
                        <button class="card-button" onclick="event.stopImmediatePropagation(); CollectionManager.add(${card.id}); SearchUI.performSearch();" style="background: #4caf50;">+C</button>
                    </div>
                `;

                archetypeGroup.appendChild(cardDiv);
            });

            container.appendChild(archetypeGroup);
        });
    }

    /**
     * Display search results in container
     * @param {HTMLElement} container - Results container
     * @param {Array} cards - Cards to display
     */
    function displaySearchResults(container, cards) {
        UIUtils.clearElement(container);

        if (cards.length === 0) {
            container.innerHTML = '<p>No cards found.</p>';
            return;
        }

        cards.forEach(card => {
            const inCollection = CollectionManager.getQuantity(card.id);
            const count = CollectionManager.getQuantity(card.id);

            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.draggable = true;
            cardDiv.setAttribute('data-card-id', card.id);
            cardDiv.setAttribute('data-card-data', JSON.stringify({
                id: card.id,
                name: card.name,
                type: card.type,
                archetype: card.archetype || 'No archetype'
            }));

            cardDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/json', JSON.stringify({
                    id: card.id,
                    name: card.name,
                    type: card.type,
                    archetype: card.archetype || 'No archetype'
                }));
            });

            cardDiv.addEventListener('mouseenter', (e) => {
                UIUtils.showCardTooltip(card, e.clientX, e.clientY);
            });

            cardDiv.addEventListener('mousemove', (e) => {
                UIUtils.updateTooltipPosition(e.clientX, e.clientY);
            });

            cardDiv.addEventListener('mouseleave', () => {
                UIUtils.hideCardTooltip();
            });

            cardDiv.addEventListener('click', () => CardModalUI.show(card.id));



            const imageUrl = CardUtils.getCardImageUrl(card);
            cardDiv.innerHTML = `
                <div class="collection-card-image">
                    <img src="${imageUrl}" alt="${card.name}" style="cursor: pointer;" onerror="this.src='https://via.placeholder.com/90x126?text=?'" title="${card.name}">
                    <span class="collection-card-count">×${count}</span>
                </div>
                <div class="card-buttons">
                    <button class="card-button" onclick="event.stopImmediatePropagation(); DeckManager.addCard(${card.id}); DeckUI.renderDeck();" style="background: #2196F3;">+D</button>
                    <button class="card-button" onclick="event.stopImmediatePropagation(); CollectionManager.add(${card.id}); SearchUI.performSearch();" style="background: #4caf50;">+C</button>
                </div>
            `;

            container.appendChild(cardDiv);
        });
    }

    /**
     * Update collection count display
     */
    function updateCollectionCount() {
        const stats = CollectionManager.getStats();
        const countEl = document.getElementById('collectionCount');
        if (countEl) {
            countEl.textContent = stats.uniqueCards > 0 ? `(${stats.uniqueCards} in collection)` : '';
        }
    }

    return {
        performSearch,
        displaySearchResults,
        displaySearchResultsGrouped,
        updateCollectionCount
    };
})();
