function _syncModeButton() {
  const btn = UI.get('btn-mode');
  btn.textContent = State.editMode ? 'Edit Mode' : 'View Mode';
  btn.className   = State.editMode ? 'btn-mode btn-mode--edit' : 'btn-mode btn-mode--view';
}

window.addEventListener('load', () => {
  loadData();
  buildSidebar();
  _syncModeButton();
  navigate('home');

  UI.get('btn-new-group').addEventListener('click', () => navigate('new-group'));

  UI.get('btn-mode').addEventListener('click', () => {
    State.editMode = !State.editMode;
    _syncModeButton();
    renderCurrentView();
  });

  UI.get('btn-export').addEventListener('click', () => {
    downloadFile(exportXML(), 'storyforge.xml', 'application/xml');
  });

  UI.get('btn-import').addEventListener('click', () => UI.get('import-file').click());

  UI.get('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { importXML(ev.target.result); buildSidebar(); navigate('home'); };
    reader.readAsText(file);
    e.target.value = '';
  });

  UI.get('search-input').addEventListener('keyup', e => {
    if (e.key !== 'Enter') return;
    const term = e.target.value.toLowerCase().trim();
    if (!term) return;
    for (const g of State.data.groups) {
      const idx = g.items.findIndex(i =>
        i.name.toLowerCase().includes(term) || (i.content || '').toLowerCase().includes(term)
      );
      if (idx !== -1) { navigateToItem(g.slug, idx); return; }
    }
    alert('Nothing found for: ' + term);
  });
});
