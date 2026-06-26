/**
 * Collection UI Module - Renders collection view
 */

const CollectionUI = (() => {
    const CARDS_PER_PAGE = 9;
    let currentPage = 0;
    let filteredCards = null;

    /**
     * Render collection view
     * @param {string} containerId - Container element ID
     */
    async function render(containerId = 'collectionView') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const collection = CollectionManager.getAll();
        const cardIds = Object.keys(collection);

        if (cardIds.length === 0) {
            UIUtils.clearElement(container);
            container.innerHTML = '<p>Your collection is empty.</p>';
            return;
        }

        container.innerHTML = '<p>Loading collection...</p>';

        try {
            // Get filter options
            const filters = getActiveFilters();

            // Get filtered cards
            filteredCards = await CollectionManager.getFilteredCards(filters);

            // Paginate
            const paginationInfo = UIUtils.getPaginationInfo(filteredCards, currentPage, CARDS_PER_PAGE);
            currentPage = paginationInfo.currentPage;

            // Render cards
            UIUtils.clearElement(container);
            paginationInfo.items.forEach(({ card, count }) => {
                const cardEl = createCollectionCardElement(card, count);
                container.appendChild(cardEl);
            });

            // Add pagination controls
            const paginationEl = UIUtils.createPaginationControls(paginationInfo, (page) => {
                currentPage = page;
                render(containerId);
            });
            container.appendChild(paginationEl);
        } catch (e) {
            container.innerHTML = '<p>Error loading collection.</p>';
            console.error('Collection render error:', e);
        }
    }

    /**
     * Create collection card element
     * @param {Object} card - Card data
     * @param {number} count - Card count
     * @returns {HTMLElement} Card element
     */
    function createCollectionCardElement(card, count) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';// collection-card';
        cardDiv.draggable = true;
        cardDiv.setAttribute('data-card-id', card.id);

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
            <img src="${imageUrl}" alt="${card.name}" style="cursor: pointer;" onerror="this.src='https://via.placeholder.com/90x126?text=?'">
            <span class="collection-card-count">×${count}</span>
        </div>
        `;

        return cardDiv;
    }

    /**
     * Toggle filters panel visibility
     */
    function toggleFilters(panelId = 'collectionFilterPanel', buttonId = 'toggleCollectionFiltersBtn') {
        const panel = document.getElementById(panelId);
        const button = document.getElementById(buttonId);
        if (!panel) return;

        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'flex' : 'none';
        if (button) button.textContent = isHidden ? 'Hide Filters' : 'Show Filters';
    }

    /**
     * Toggle a single filter chip open/closed (closes others)
     * @param {string} chipId - Chip identifier (e.g. 'name', 'type')
     */
    function toggleChip(chipId) {
        const chip = document.getElementById('chip-' + chipId);
        if (!chip) return;
        const isOpen = chip.classList.contains('open');
        document.querySelectorAll('.filter-chip.open').forEach(c => c.classList.remove('open'));
        if (!isOpen) chip.classList.add('open');
    }

    /**
     * Called when any filter input changes — updates indicators and re-renders
     */
    function onFilterChange() {
        updateChipIndicators();
        currentPage = 0;
        render();
    }

    /**
     * Update the * dot and highlight on each chip based on active filter values
     */
    function updateChipIndicators() {
        const val = id => document.getElementById(id)?.value || '';

        const isActive = {
            name:      () => val('collectionName'),
            type:      () => getSelectedTypeTokens().length > 0,
            race:      () => val('collectionRace'),
            attribute: () => val('collectionAttribute'),
            archetype: () => val('collectionArchetype'),
            level:     () => val('collectionLevelRange'),
            atk:       () => val('collectionAtkRange'),
            def:       () => val('collectionDefRange'),
            count:     () => val('collectionCountRange'),
            sort:      () => val('collectionSort1') !== 'name' || val('collectionSort2') || val('collectionOrder') !== 'asc',
        };

        let anyActive = false;
        Object.entries(isActive).forEach(([id, check]) => {
            const active = Boolean(check());
            const dot = document.getElementById(`chip-${id}-dot`);
            const btn = document.querySelector(`#chip-${id} .filter-chip-btn`);
            if (dot) dot.style.display = active ? 'inline' : 'none';
            if (btn) btn.classList.toggle('has-value', active);
            if (active) anyActive = true;
        });

        const clearBtn = document.getElementById('clearFiltersChip');
        if (clearBtn) clearBtn.style.display = anyActive ? '' : 'none';
    }

    /**
     * Get active filter options from UI
     * @returns {Object} Filter options
     */
    function getActiveFilters() {
        return {
            name: document.getElementById('collectionName')?.value || '',
            typeTokens: getSelectedTypeTokens(),
            race: document.getElementById('collectionRace')?.value || '',
            attribute: document.getElementById('collectionAttribute')?.value || '',
            archetype: document.getElementById('collectionArchetype')?.value || '',
            levelRange: CardUtils.parseRangeInput(document.getElementById('collectionLevelRange')?.value),
            atkRange: CardUtils.parseRangeInput(document.getElementById('collectionAtkRange')?.value),
            defRange: CardUtils.parseRangeInput(document.getElementById('collectionDefRange')?.value),
            countRange: CardUtils.parseRangeInput(document.getElementById('collectionCountRange')?.value),
            sortBy: document.getElementById('collectionSort1')?.value || 'name',
            sortBy2: document.getElementById('collectionSort2')?.value || '',
            sortOrder: document.getElementById('collectionOrder')?.value || 'asc'
        };
    }

    /**
     * Clear all filters and reset sort to defaults
     */
    function clearFilters() {
        document.querySelectorAll('#type-tokens-container .type-token.selected')
            .forEach(b => b.classList.remove('selected'));

        ['collectionName', 'collectionRace', 'collectionAttribute',
         'collectionArchetype', 'collectionLevelRange', 'collectionAtkRange',
         'collectionDefRange', 'collectionCountRange'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const sort1 = document.getElementById('collectionSort1');
        const sort2 = document.getElementById('collectionSort2');
        const order = document.getElementById('collectionOrder');
        if (sort1) sort1.value = 'name';
        if (sort2) sort2.value = '';
        if (order) order.value = 'asc';

        document.querySelectorAll('.filter-chip.open').forEach(c => c.classList.remove('open'));
        updateChipIndicators();
        currentPage = 0;
        render();
    }

    /**
     * Populate Race/Attribute selects and the Type token checklist
     * from actual collection card data.
     * @param {Array} cards - Array of { card, count }
     */
    function populateFilterSelects(cards) {
        const monsterSubtypes = new Set();
        const spellTrapSubtypes = new Set();
        const races = new Set();
        const attributes = new Set();

        cards.forEach(({ card }) => {
            if (!card.type) return;
            const isMonster = card.type.includes('Monster');
            const isSpellTrap = card.type.includes('Spell') || card.type.includes('Trap');

            if (isMonster) {
                // Collect monster-specific type modifiers (strip "Monster" and "Card")
                card.type.split(' ').forEach(t => {
                    if (t !== 'Monster' && t !== 'Card') monsterSubtypes.add(t);
                });
                // Only monster races go into the Race filter
                if (card.race) races.add(card.race);
            } else if (isSpellTrap) {
                // Spell/Trap subtypes come from the race field
                if (card.race) spellTrapSubtypes.add(card.race);
            }

            if (card.attribute) attributes.add(card.attribute);
        });

        populateTypeTokens(
            [...monsterSubtypes].sort(),
            [...spellTrapSubtypes].sort()
        );
        fillSelect('collectionRace',      [...races].sort());
        fillSelect('collectionAttribute', [...attributes].sort());
    }

    /**
     * Render type token pills in three groups:
     *   Category (Monster / Spell / Trap) — always shown
     *   Monster subtypes — dynamic
     *   Spell & Trap subtypes — dynamic from race field
     * Preserves currently selected tokens.
     */
    function populateTypeTokens(monsterSubtypes, spellTrapSubtypes) {
        const container = document.getElementById('type-tokens-container');
        if (!container) return;

        const selected = new Set(getSelectedTypeTokens());
        container.innerHTML = '';

        const makeToken = token => {
            const btn = document.createElement('button');
            btn.className = 'type-token' + (selected.has(token) ? ' selected' : '');
            btn.dataset.token = token;
            btn.textContent = token;
            btn.onclick = e => { e.stopPropagation(); toggleTypeToken(btn); };
            return btn;
        };

        const makeSeparator = label => {
            const sep = document.createElement('div');
            sep.className = 'token-separator';
            sep.textContent = label;
            return sep;
        };

        // Group 1: main categories (fixed)
        ['Monster', 'Spell', 'Trap'].forEach(t => container.appendChild(makeToken(t)));

        // Group 2: monster subtypes
        if (monsterSubtypes.length > 0) {
            container.appendChild(makeSeparator('Monster'));
            monsterSubtypes.forEach(t => container.appendChild(makeToken(t)));
        }

        // Group 3: spell & trap subtypes (from race)
        if (spellTrapSubtypes.length > 0) {
            container.appendChild(makeSeparator('Spell & Trap'));
            spellTrapSubtypes.forEach(t => container.appendChild(makeToken(t)));
        }
    }

    /**
     * Toggle a type token pill on/off and re-render.
     * @param {HTMLElement} btn - The token button element
     */
    function toggleTypeToken(btn) {
        btn.classList.toggle('selected');
        onFilterChange();
    }

    /** Return the list of currently selected type tokens. */
    function getSelectedTypeTokens() {
        return [...document.querySelectorAll('#type-tokens-container .type-token.selected')]
            .map(b => b.dataset.token);
    }

    /**
     * Rebuild a select's options while preserving the current value.
     * @param {string} id - Element ID
     * @param {string[]} values - Sorted option values
     * @param {Function} [groupFn] - Optional fn(value) → group label
     */
    function fillSelect(id, values, groupFn = null) {
        const el = document.getElementById(id);
        if (!el) return;
        const current = el.value;

        // Keep only the first "Any" option
        while (el.options.length > 1) el.remove(1);

        if (groupFn) {
            const groups = {};
            values.forEach(v => {
                const g = groupFn(v);
                (groups[g] = groups[g] || []).push(v);
            });
            Object.entries(groups).forEach(([label, vals]) => {
                const group = document.createElement('optgroup');
                group.label = label;
                vals.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = opt.textContent = v;
                    group.appendChild(opt);
                });
                el.appendChild(group);
            });
        } else {
            values.forEach(v => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = v;
                el.appendChild(opt);
            });
        }

        if ([...el.options].some(o => o.value === current)) el.value = current;
    }

    /**
     * Show/toggle collection view
     */
    async function toggle() {
        const view = document.getElementById('collectionView');
        if (!view) return;

        if (view.style.display === 'none') {
            currentPage = 0;
            filteredCards = null;
            // Populate selects from live collection data before rendering
            const allCards = await CollectionManager.getCollectionCards();
            populateFilterSelects(allCards);
            render();
            view.style.display = 'flex';
        } else {
            view.style.display = 'none';
        }
    }

    /**
     * Update collection stats display
     */
    function updateStats() {
        const stats = CollectionManager.getStats();
        const statsEl = document.getElementById('collectionStats');

        if (statsEl) {
            statsEl.textContent = `Total cards: ${stats.totalCards} | Unique cards: ${stats.uniqueCards}`;
        }
    }

    /**
     * Export collection as JSON
     */
    function exportAsJSON() {
        const content = CollectionManager.exportToJSON();
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'yu-gi-oh-collection.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Clear entire collection with confirmation
     */
    function clearAll() {
        if (confirm('Are you sure you want to clear your entire collection?')) {
            CollectionManager.clear();
            updateStats();
            render();
        }
    }

    return {
        render,
        createCollectionCardElement,
        toggleFilters,
        toggleChip,
        onFilterChange,
        updateChipIndicators,
        populateFilterSelects,
        toggleTypeToken,
        getSelectedTypeTokens,
        getActiveFilters,
        clearFilters,
        toggle,
        updateStats,
        exportAsJSON,
        clearAll
    };
})();
