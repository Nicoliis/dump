function _syncModeButton() {
  const btn = UI.get('btn-mode');
  btn.textContent = State.editMode ? 'Edit Mode' : 'View Mode';
  btn.className   = State.editMode ? 'btn-mode btn-mode--edit' : 'btn-mode btn-mode--view';
}

let _booted = false;

window.addEventListener('load', () => {
  _wireTopbar();
  _syncModeButton();

  // The auth gate guarantees we only get here once signed in.
  if (window.Auth) {
    Auth.onChange(async ({ user }) => {
      if (!user) { _booted = false; return; }
      if (_booted) return;
      _booted = true;
      State.profile = await Cloud.ensureProfile();
      await Cloud.migrateLegacy();
      goGallery();
    });
  } else {
    goGallery();
  }
});

function _wireTopbar() {
  UI.get('btn-gallery').addEventListener('click', () => goGallery());
  UI.get('btn-profile').addEventListener('click', () => goProfile());
  UI.get('btn-world-settings').addEventListener('click', () => openWorldSettings());
  UI.get('btn-new-group').addEventListener('click', () => navigate('new-group'));
  UI.get('btn-signout').addEventListener('click', () => Auth.signOut());

  UI.get('btn-mode').addEventListener('click', () => {
    if (!isOwner()) return; // only owners can edit
    State.editMode = !State.editMode;
    _syncModeButton();
    _chrome();
    buildSidebar();
    renderCurrentView();
  });

  UI.get('btn-export').addEventListener('click', () => {
    const name = (State.currentWorld?.title || 'storyforge').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadFile(exportXML(), name + '.xml', 'application/xml');
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
    if (e.key !== 'Enter' || !State.data) return;
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
}
