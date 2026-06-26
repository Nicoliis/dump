/**
 * Deck UI Module - Renders and manages deck view
 * Handles group rendering, card display, drag-drop, and group management
 */

const DeckUI = (() => {
    const GROUP_CARDS_PER_PAGE = 25;
    let draggedCard = null;
    let draggedFromGroup = null;

    /**
     * Render entire deck view
     * @param {string} containerId - Container element ID
     */
    async function renderDeck(containerId = 'deckArea') {
        const container = document.getElementById(containerId);
        if (!container) return;

        UIUtils.clearElement(container);

        const groups = DeckManager.getAllGroups();

        for (const [index, group] of groups.entries()) {
            const groupElement = createGroupElement(group, index);
            container.appendChild(groupElement);
        }

        // Add new group button
        const addGroupBtn = document.createElement('button');
        addGroupBtn.className = 'add-group-btn';
        addGroupBtn.textContent = '+ Add Group';
        addGroupBtn.onclick = showAddGroupDialog;
        container.appendChild(addGroupBtn);

        updateDeckStats();
    }

    /**
     * Create group DOM element
     * @param {Object} group - Group data
     * @param {number} groupIndex - Group index
     * @returns {HTMLElement} Group element
     */
    function createGroupElement(group, groupIndex) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'deck-group';
        groupDiv.setAttribute('data-group-index', groupIndex);

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'group-header';
        headerDiv.addEventListener('dragover', handleDragOver);
        headerDiv.addEventListener('dragleave', handleDragLeave);
        headerDiv.addEventListener('drop', (e) => handleDrop(e, groupIndex));

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'group-toggle';
        toggleBtn.textContent = group.expanded ? '▼' : '▶';
        toggleBtn.onclick = () => {
            DeckManager.toggleGroupExpanded(groupIndex);
            renderDeck();
        };

        const titleSpan = document.createElement('span');
        titleSpan.className = 'group-title';
        titleSpan.textContent = `${group.name} (${group.cards.length})`;
        titleSpan.onclick = () => {
            DeckManager.toggleGroupExpanded(groupIndex);
            renderDeck();
        };
        titleSpan.style.cursor = 'pointer';

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'group-controls';

        const editBtn = document.createElement('button');
        editBtn.className = 'group-edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => showEditGroupDialog(groupIndex);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'group-delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => showDeleteGroupDialog(groupIndex);
        deleteBtn.disabled = DeckManager.getAllGroups().length <= 1;

        controlsDiv.appendChild(editBtn);
        controlsDiv.appendChild(deleteBtn);

        headerDiv.appendChild(toggleBtn);
        headerDiv.appendChild(titleSpan);
        headerDiv.appendChild(controlsDiv);
        groupDiv.appendChild(headerDiv);

        // Content
        if (group.expanded) {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'group-content';
            contentDiv.setAttribute('data-group-index', groupIndex);
            contentDiv.addEventListener('dragover', handleDragOver);
            contentDiv.addEventListener('dragleave', handleDragLeave);
            contentDiv.addEventListener('drop', (e) => handleDrop(e, groupIndex));

            renderGroupCards(contentDiv, group, groupIndex);
            groupDiv.appendChild(contentDiv);
        }

        return groupDiv;
    }

    /**
     * Render cards in a group
     * @param {HTMLElement} container - Container element
     * @param {Object} group - Group data
     * @param {number} groupIndex - Group index
     */
    async function renderGroupCards(container, group, groupIndex) {
        if (!group || group.cards.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = '#aaa';
            emptyMsg.textContent = 'No cards in this group. Drag cards here or search for cards.';
            container.appendChild(emptyMsg);
            return;
        }

        // Group cards by ID and get counts
        const counts = {};
        group.cards.forEach(id => {
            counts[id] = (counts[id] || 0) + 1;
        });

        const uniqueIds = Object.keys(counts);

        // Fetch card details
        const cardDetails = await CardAPI.fetchMultipleCards(uniqueIds);

        for (const cardData of cardDetails) {
            const count = counts[cardData.id];
            const cardElement = createDeckCardElement(cardData, count, groupIndex);
            container.appendChild(cardElement);
        }
    }

    /**
     * Create a deck card element
     * @param {Object} card - Card data
     * @param {number} count - Number of copies
     * @param {number} groupIndex - Group index
     * @returns {HTMLElement} Card element
     */
    function createDeckCardElement(card, count, groupIndex) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.draggable = true;
        cardDiv.setAttribute('data-card-id', card.id);
        cardDiv.setAttribute('data-group-index', groupIndex);

        cardDiv.addEventListener('dragstart', (e) => {
            draggedCard = card.id;
            draggedFromGroup = groupIndex;
            e.dataTransfer.effectAllowed = 'move';
        });

        cardDiv.addEventListener('dragend', () => {
            draggedCard = null;
            draggedFromGroup = null;
        });

        cardDiv.addEventListener('click', () => CardModalUI.show(card.id));

        const imageUrl = CardUtils.getCardImageUrl(card);
        cardDiv.innerHTML = `
            <img src="${imageUrl}" alt="${card.name}" onerror="this.src='https://via.placeholder.com/90x126?text=?'" title="${card.name}" style="cursor: pointer;">
            <span class="collection-card-count">×${count}</span>
            <div class="card-buttons">
                <button class="card-button" onclick="event.stopImmediatePropagation(); DeckManager.removeCard(${card.id}, ${groupIndex}); DeckUI.renderDeck();" style="background: #f44336;">−</button>
            </div>
        `;

        return cardDiv;
    }

    /**
     * Handle drag over group
     * @param {DragEvent} e - Drag event
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        const groupContent = e.target.closest('.group-content');
        if (groupContent) {
            groupContent.classList.add('drag-over');
        }

        const groupHeader = e.target.closest('.group-header');
        if (groupHeader) {
            groupHeader.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave group
     * @param {DragEvent} e - Drag event
     */
    function handleDragLeave(e) {
        const groupContent = e.target.closest('.group-content');
        if (groupContent) {
            groupContent.classList.remove('drag-over');
        }

        const groupHeader = e.target.closest('.group-header');
        if (groupHeader) {
            groupHeader.classList.remove('drag-over');
        }
    }

    /**
     * Handle drop on group
     * @param {DragEvent} e - Drag event
     * @param {number} targetGroupIndex - Target group index
     */
    function handleDrop(e, targetGroupIndex) {
        e.preventDefault();

        // Remove drag-over class
        document.querySelectorAll('.group-content.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });

        // Handle drop from search results (card from API)
        try {
            const cardData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (cardData && cardData.id) {
                const result = DeckManager.addCard(cardData.id, targetGroupIndex);
                if (result.success) {
                    renderDeck();
                } else {
                    alert(result.message);
                }
                return;
            }
        } catch (err) {
            // Not from search results, continue
        }

        // Handle internal drag (move between groups)
        if (draggedCard !== null && draggedFromGroup !== null && draggedFromGroup !== targetGroupIndex) {
            const success = DeckManager.moveCard(draggedCard, draggedFromGroup, targetGroupIndex);
            if (success) {
                renderDeck();
            }
        }

        draggedCard = null;
        draggedFromGroup = null;
    }

    /**
     * Show add group dialog
     */
    function showAddGroupDialog() {
        const name = prompt('Enter group name:');
        if (name && name.trim()) {
            if (DeckManager.createGroup(name)) {
                renderDeck();
            }
        }
    }

    /**
     * Show edit group dialog
     * @param {number} groupIndex - Group index
     */
    function showEditGroupDialog(groupIndex) {
        const group = DeckManager.getGroup(groupIndex);
        if (!group) return;

        const newName = prompt('Enter new group name:', group.name);
        if (newName && newName.trim()) {
            if (DeckManager.renameGroup(groupIndex, newName)) {
                renderDeck();
            }
        }
    }

    /**
     * Show delete group confirmation dialog
     * @param {number} groupIndex - Group index
     */
    function showDeleteGroupDialog(groupIndex) {
        const group = DeckManager.getGroup(groupIndex);
        if (!group) return;

        if (confirm(`Delete group "${group.name}" and all its cards?`)) {
            if (DeckManager.deleteGroup(groupIndex)) {
                renderDeck();
            }
        }
    }

    /**
     * Update deck statistics display
     */
    function updateDeckStats() {
        const stats = DeckManager.getStats();
        const totalElement = document.getElementById('totalCards');
        if (totalElement) {
            totalElement.textContent = stats.totalCards;
        }
    }

    /**
     * Export deck to YDK and download
     */
    function exportDeckAsYDK() {
        const content = DeckManager.exportToYDK();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_deck.ydk';
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Handle YDK import
     * @param {File} file - File to import
     */
    async function importDeckFromYDK(file) {
        const content = await file.text();
        const result = DeckManager.importFromYDK(content);

        if (result.success) {
            DeckManager.loadGroups(result.groups);
            renderDeck();
            alert('Deck imported successfully!');
        } else {
            alert('Failed to import deck');
        }
    }

    return {
        renderDeck,
        createGroupElement,
        renderGroupCards,
        createDeckCardElement,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        showAddGroupDialog,
        showEditGroupDialog,
        showDeleteGroupDialog,
        updateDeckStats,
        exportDeckAsYDK,
        importDeckFromYDK
    };
})();
