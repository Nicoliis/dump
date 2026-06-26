/**
 * Import UI Module - Preview-before-import system for all import types
 */

const ImportUI = (() => {
    // Pending import state — cleared after confirm or cancel
    let pendingBulk = null;
    let pendingYDK = null;
    let pendingCSV = null;
    let pendingCollection = null;

    // =========================================================
    //  BULK ADD
    // =========================================================

    async function processBulk() {
        const textarea = document.getElementById('bulkAddTextarea');
        const names = textarea.value.split('\n').map(n => n.trim()).filter(n => n);
        if (!names.length) return;

        const btn = document.getElementById('processBulkBtn');
        btn.textContent = 'Searching…';
        btn.disabled = true;

        pendingBulk = await Promise.all(
            names.map(async name => {
                try {
                    const cards = await CardAPI.searchCardsByName(name);
                    return { inputName: name, card: cards.length > 0 ? cards[0] : null };
                } catch {
                    return { inputName: name, card: null };
                }
            })
        );

        btn.textContent = 'Process';
        btn.disabled = false;

        renderCardList('bulkCardList', pendingBulk.map(p => ({
            name: p.card ? p.card.name : p.inputName,
            found: p.card !== null,
            qty: 1
        })));
        setupDestinationRadios('bulkDestination', 'deckGroupSelector', 'groupCheckboxes');
        showPreview('bulkPreview');
    }

    function confirmBulk() {
        if (!pendingBulk) return;
        const dest = getDestination('bulkDestination');
        const groupIdx = getSelectedGroupIdx('groupCheckboxes');

        pendingBulk.forEach(({ card }) => {
            if (!card) return;
            if (dest === 'collection') {
                CollectionManager.add(card.id);
            } else {
                DeckManager.addCard(card.id, groupIdx);
            }
        });

        CollectionUI.updateStats();
        DeckUI.render();
        cancelBulk();
    }

    function cancelBulk() {
        pendingBulk = null;
        hidePreview('bulkPreview');
    }

    // =========================================================
    //  YDK IMPORT
    // =========================================================

    async function processYDK(event) {
        const file = event.target.files[0];
        if (!file) return;

        setFileLabel('ydkFileName', file.name);

        const content = await file.text();
        const parsed = DeckManager.importFromYDK(content);
        if (!parsed.success) { alert('Could not parse YDK file.'); return; }

        // Count occurrences of each card ID across all groups
        const counts = {};
        parsed.groups.forEach(g => {
            g.cards.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
        });

        // Fetch card details for all unique IDs
        const uniqueIds = Object.keys(counts).map(Number);
        const cardMap = {};
        await Promise.all(uniqueIds.map(async id => {
            cardMap[id] = await CardAPI.fetchCardById(id);
        }));

        pendingYDK = { parsed, counts, cardMap };

        renderCardList('ydkCardList', uniqueIds.map(id => ({
            name: cardMap[id]?.name || `ID: ${id}`,
            found: !!cardMap[id],
            qty: counts[id]
        })));
        setupDestinationRadios('ydkDestination', 'ydkGroupSelector', 'ydkGroupCheckboxes');
        showPreview('ydkPreview');
    }

    function confirmYDK() {
        if (!pendingYDK) return;
        const dest = getDestination('ydkDestination');
        const { parsed } = pendingYDK;

        if (dest === 'collection') {
            parsed.groups.forEach(group => {
                group.cards.forEach(id => CollectionManager.add(id));
            });
        } else {
            DeckManager.loadGroups(parsed.groups);
        }

        CollectionUI.updateStats();
        DeckUI.render();
        cancelYDK();
    }

    function cancelYDK() {
        pendingYDK = null;
        resetFileInput('ydkImportInput', 'ydkFileName');
        hidePreview('ydkPreview');
    }

    // =========================================================
    //  CSV IMPORT
    // =========================================================

    async function processCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        setFileLabel('csvFileName', file.name);

        const content = await file.text();
        const lines = content.split(/\r\n|\n|\r/).map(l => l.trim()).filter(l => l);

        const items = [];
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',').map(p => p.trim());
            if (parts.length < 7) continue;
            // Format: cardname, cardq, cardrarity, card_edition, cardset, cardcode, cardid, ...
            const id = parseInt(parts[6]);
            const quantity = parseInt(parts[1]) || 1;
            if (isNaN(id)) continue;
            const card = await CardAPI.fetchCardById(id);
            items.push({ cardId: id, card, quantity });
        }

        pendingCSV = items;

        renderCardList('csvCardList', items.map(p => ({
            name: p.card?.name || `ID: ${p.cardId}`,
            found: !!p.card,
            qty: p.quantity
        })));
        setupDestinationRadios('csvDestination', 'csvGroupSelector', 'csvGroupCheckboxes');
        showPreview('csvPreview');
    }

    function confirmCSV() {
        if (!pendingCSV) return;
        const dest = getDestination('csvDestination');
        const groupIdx = getSelectedGroupIdx('csvGroupCheckboxes');

        pendingCSV.forEach(({ cardId, card, quantity }) => {
            const id = card?.id || cardId;
            for (let i = 0; i < quantity; i++) {
                if (dest === 'collection') {
                    CollectionManager.add(id);
                } else {
                    DeckManager.addCard(id, groupIdx);
                }
            }
        });

        CollectionUI.updateStats();
        DeckUI.render();
        cancelCSV();
    }

    function cancelCSV() {
        pendingCSV = null;
        resetFileInput('csvImportInput', 'csvFileName');
        hidePreview('csvPreview');
    }

    // =========================================================
    //  COLLECTION JSON IMPORT
    // =========================================================

    async function processCollection(event) {
        const file = event.target.files[0];
        if (!file) return;

        setFileLabel('collectionFileName', file.name);

        const content = await file.text();
        const result = CollectionManager.importFromJSON(content);
        if (!result.success) { alert(result.message); return; }

        pendingCollection = result.collection;

        const total = Object.values(result.collection).reduce((s, c) => s + c, 0);
        const unique = Object.keys(result.collection).length;

        const listEl = document.getElementById('collectionCardList');
        if (listEl) {
            listEl.innerHTML = `<div class="import-collection-summary">
                <span>${unique} unique cards</span>
                <span>${total} total copies</span>
            </div>`;
        }

        showPreview('collectionPreview');
    }

    function confirmCollection() {
        if (!pendingCollection) return;
        CollectionManager.merge(pendingCollection);
        CollectionUI.updateStats();
        cancelCollection();
    }

    function cancelCollection() {
        pendingCollection = null;
        resetFileInput('collectionImportInput', 'collectionFileName');
        hidePreview('collectionPreview');
    }

    // =========================================================
    //  HELPERS
    // =========================================================

    /** Render a card list into a container element */
    function renderCardList(containerId, items) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const found = items.filter(i => i.found).length;
        const notFound = items.length - found;

        el.innerHTML = items.map(item => `
            <div class="import-card-item">
                <span class="import-card-status ${item.found ? 'found' : 'not-found'}"></span>
                <span class="import-card-name${item.found ? '' : ' not-found'}">${esc(item.name)}</span>
                ${item.qty > 1 ? `<span class="import-card-qty">×${item.qty}</span>` : ''}
            </div>
        `).join('') + `<div class="import-card-list-summary">
            ${found} found${notFound ? ` · ${notFound} not found` : ''}
        </div>`;
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /** Show a preview section */
    function showPreview(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'flex';
    }

    /** Hide a preview section */
    function hidePreview(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    /** Update the file label span and toggle has-file on the zone */
    function setFileLabel(spanId, name) {
        const el = document.getElementById(spanId);
        if (!el) return;
        el.textContent = name;
        const zone = el.closest('.file-upload-zone');
        if (zone) zone.classList.toggle('has-file', true);
    }

    /** Reset a file input and its label */
    function resetFileInput(inputId, spanId) {
        const input = document.getElementById(inputId);
        if (input) input.value = '';
        const span = document.getElementById(spanId);
        if (span) {
            span.textContent = 'No file selected';
            span.closest('.file-upload-zone')?.classList.remove('has-file');
        }
    }

    /** Get the selected destination radio value */
    function getDestination(radioName) {
        return document.querySelector(`input[name="${radioName}"]:checked`)?.value || 'collection';
    }

    /** Get the first selected group index from a checkbox container */
    function getSelectedGroupIdx(containerId) {
        const checked = document.querySelector(`#${containerId} input[type="checkbox"]:checked`);
        return checked ? parseInt(checked.value) : 0;
    }

    /**
     * Wire up destination radio buttons to show/hide the deck group selector.
     * Must be called each time a preview is shown (because HTML is static).
     */
    function setupDestinationRadios(radioName, selectorId, checkboxesId) {
        const selector = document.getElementById(selectorId);
        const checkboxesEl = document.getElementById(checkboxesId);
        if (!selector || !checkboxesEl) return;

        // Populate checkboxes fresh each time in case groups changed
        const groups = DeckManager.getAllGroups();
        checkboxesEl.innerHTML = groups.map((g, i) => `
            <label>
                <input type="checkbox" value="${i}" checked>
                ${esc(g.name)}
            </label>
        `).join('');

        // Re-bind radio change listeners
        document.querySelectorAll(`input[name="${radioName}"]`).forEach(radio => {
            radio.addEventListener('change', () => {
                selector.style.display = radio.value === 'deck' && radio.checked ? 'flex' : 'none';
            });
        });

        // Reset to collection
        selector.style.display = 'none';
        const collectionRadio = document.querySelector(`input[name="${radioName}"][value="collection"]`);
        if (collectionRadio) collectionRadio.checked = true;
    }

    return {
        processBulk,
        confirmBulk,
        cancelBulk,
        processYDK,
        confirmYDK,
        cancelYDK,
        processCSV,
        confirmCSV,
        cancelCSV,
        processCollection,
        confirmCollection,
        cancelCollection
    };
})();
