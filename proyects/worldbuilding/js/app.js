/* ── Topbar helpers ───────────────────────────────────────────── */

function _syncModeToggle() {
  const v = UI.get('mode-view'), e = UI.get('mode-edit');
  if (!v || !e) return;
  v.classList.toggle('seg-btn--on', !State.editMode);
  e.classList.toggle('seg-btn--on',  State.editMode);
}

function _setEditMode(on) {
  if (!isOwner() || State.editMode === on) return;
  State.editMode = on;
  _chrome();
  buildSidebar();
  renderCurrentView();
}

// Fill the avatar + name in the user menu from the loaded profile.
function _renderUserMenu() {
  const p = State.profile;
  const user = window.Auth?.getUser();
  const name = p?.display_name || p?.username || user?.email?.split('@')[0] || 'Me';
  const nm = UI.get('user-name');
  const av = UI.get('user-avatar');
  if (nm) nm.textContent = name;
  if (av) {
    if (p?.avatar_url) {
      av.className = 'avatar';
      av.textContent = '';
      av.style.backgroundImage = `url("${p.avatar_url}")`;
      av.style.backgroundSize = 'cover';
      av.style.backgroundPosition = 'center';
    } else {
      av.className = 'avatar avatar--initial';
      av.style.backgroundImage = '';
      av.textContent = (name[0] || '?').toUpperCase();
    }
  }
}

/* ── Bootstrap ────────────────────────────────────────────────── */

let _booted = false;

window.addEventListener('load', () => {
  _wireTopbar();

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

/* ── Wiring ───────────────────────────────────────────────────── */

function _wireDropdown(wrapId, btnId) {
  const wrap = UI.get(wrapId), btn = UI.get(btnId);
  if (!wrap || !btn) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown.open').forEach(d => { if (d !== wrap) d.classList.remove('open'); });
    wrap.classList.toggle('open');
  });
}

function _wireTopbar() {
  UI.get('brand').addEventListener('click', () => goGallery());

  _wireDropdown('world-menu-wrap', 'world-menu-btn');
  _wireDropdown('user-menu-wrap',  'user-trigger');
  // Any click elsewhere closes open menus (menu-item clicks bubble here too).
  document.addEventListener('click', () =>
    document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open')));

  UI.get('mode-view').addEventListener('click', () => _setEditMode(false));
  UI.get('mode-edit').addEventListener('click', () => _setEditMode(true));

  UI.get('btn-profile').addEventListener('click', () => goProfile());
  UI.get('btn-signout').addEventListener('click', () => Auth.signOut());
  UI.get('btn-world-settings').addEventListener('click', () => openWorldSettings());
  UI.get('btn-new-group').addEventListener('click', () => navigate('new-group'));

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
