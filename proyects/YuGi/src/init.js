/**
 * Application Initialization Module
 * Initializes all state, loads data, and sets up event listeners
 */

const App = (() => {
    /**
     * Initialize the entire application
     */
    function init() {
        console.log('Initializing Yu-Gi-Oh Deck Builder...');

        // 1. Initialize state management from storage
        AppState.initialize();

        // 2. Setup UI event listeners
        setupSearchTab();
        setupBulkImportTab();
        setupYDKImportTab();
        setupCSVImportTab();
        setupCollectionImportTab();
        setupCollectionTab();
        setupDeckTab();
        setupCardModalTab();

        // 3. Initial render
        DeckUI.renderDeck();
        CollectionUI.updateStats();
        SearchUI.updateCollectionCount();

        // 4. Set default active tab
        switchImportTab('search');
    refreshCenterMargins();

        console.log('Application initialized successfully!');
    }

    /**
     * Setup search tab event listeners
     */
    function setupSearchTab() {
        const searchInput = document.getElementById('searchInput');
        const collectionOnly = document.getElementById('collectionOnly');

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    SearchUI.performSearch();
                }
            });
        }

        if (collectionOnly) {
            collectionOnly.addEventListener('change', () => {
                SearchUI.performSearch();
            });
        }
    }

    /**
     * Setup bulk import tab
     */
    function setupBulkImportTab() {
        // Event listeners will be setup in setupCollectionTab
    }

    /**
     * Setup YDK import tab
     */
    function setupYDKImportTab() {
        const fileInput = document.getElementById('ydkImportInput');

        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const result = await ImportHandler.handleYDKImport(file, 'deck');
                if (result.success) {
                    alert(`YDK imported: ${result.added} cards added`);
                    DeckUI.renderDeck();
                    fileInput.value = '';
                } else {
                    alert('Failed to import YDK file');
                }
            });
        }
    }

    /**
     * Setup CSV import tab
     */
    function setupCSVImportTab() {
        const fileInput = document.getElementById('csvImportInput');

        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const result = await ImportHandler.handleCSVImport(file, 'collection');
                if (result.success) {
                    alert(`CSV imported: ${result.added} cards added`);
                    CollectionUI.updateStats();
                    fileInput.value = '';
                } else {
                    alert('Failed to import CSV file');
                }
            });
        }
    }

    /**
     * Setup collection import tab
     */
    function setupCollectionImportTab() {
        const fileInput = document.getElementById('collectionImportInput');

        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const result = await ImportHandler.handleCollectionImport(file);
                if (result.success) {
                    alert(`Collection imported: ${result.added} cards merged`);
                    CollectionUI.updateStats();
                    fileInput.value = '';
                } else {
                    alert('Failed to import collection file');
                }
            });
        }
    }

    /**
     * Setup collection tab events
     */
    function setupCollectionTab() {
        const filterBtn = document.getElementById('toggleCollectionFiltersBtn');
        if (filterBtn) filterBtn.onclick = () => CollectionUI.toggleFilters();

        // Close open filter chips when clicking outside them
        document.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip.open').forEach(c => c.classList.remove('open'));
        });
    }

    /**
     * Setup deck tab events
     */
    function setupDeckTab() {
        const ydkInput = document.getElementById('ydkInput');
        if (ydkInput) {
            ydkInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    await DeckUI.importDeckFromYDK(file);
                }
            });
        }
    }

    /**
     * Setup card modal events
     */
    function setupCardModalTab() {
        const modal = document.getElementById('cardModal');
        const closeBtn = modal?.querySelector('.close');

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    CardModalUI.close();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => CardModalUI.close());
        }
    }

    return {
        init
    };
})();

// Global function for switching import tabs (called from HTML onclick)
function switchImportTab(tab) {
    const tabs = ['search', 'bulk', 'ydk', 'csv', 'collection'];
    
    tabs.forEach(t => {
        const content = document.getElementById(`${t}TabContent`);
        const tabBtn = document.getElementById(`${t}Tab`);
        
        if (content) content.style.display = t === tab ? 'flex' : 'none';
        if (tabBtn) tabBtn.classList.toggle('active', t === tab);
    });
}

// Toggle import/search panel visibility
function toggleImportPanel() {
    const header = document.getElementById('importPanelHeader');
    const panel = document.getElementById('importPanelContent');
    const btn = document.getElementById('toggleImportPanel');
    
    if (panel) {
        const isCollapsed = panel.style.display === 'none';
        header.style.display = isCollapsed ? 'flex' : 'none';
        panel.style.display = isCollapsed ? '' : 'none';
        btn.textContent = isCollapsed ? '−' : '+';
    }
}

function togglePanel(panel) {
    const isImport = panel === 'import';
    const wrapper = document.getElementById(isImport ? 'importPanel' : 'collectionPanel');
    const handle = document.getElementById(isImport ? 'importPanelHandle' : 'collectionPanelHandle');

    if (!wrapper || !handle) return;

    const isCollapsed = wrapper.classList.toggle('collapsed');
    handle.textContent = isCollapsed ? (isImport ? '›' : '‹') : (isImport ? '<' : '>');
    refreshCenterMargins();
}

function refreshCenterMargins() {
    const left = document.getElementById('importPanel');
    const right = document.getElementById('collectionPanel');
    const center = document.querySelector('.panel-center');
    if (!center) return;

    const leftWidth = left?.classList.contains('collapsed') ? 48 : 360;
    const rightWidth = right?.classList.contains('collapsed') ? 48 : 360;
    center.style.margin = `10px ${rightWidth + 10}px 10px ${leftWidth + 10}px`;
}

// Global function for search
function searchCards() {
    SearchUI.performSearch();
}

// Global function for collection view
function showCollectionView() {
    CollectionUI.toggle();
}

// Export to HTML
function exportCollection() {
    CollectionUI.exportAsJSON();
}

function clearCollection() {
    CollectionUI.clearAll();
}

function toggleCollectionFilters() {
    CollectionUI.toggleFilters();
}

function clearCollectionFilters() {
    CollectionUI.clearFilters();
}

function exportYDK() {
    ImportHandler.exportDeckYDK();
}

function importYDK() {
    document.getElementById('ydkInput')?.click();
}

async function handleYDKImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const result = await ImportHandler.handleYDKImport(file, 'deck');
    if (result.success) DeckUI.render();
    event.target.value = '';
}

function renderCollectionToggle() {
    SearchUI.performSearch();
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}