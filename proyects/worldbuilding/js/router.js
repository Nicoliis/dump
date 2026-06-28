/* ── Top-level navigation (gallery / profile / world) ─────────── */

function goGallery() {
  State.currentView = 'gallery';
  State.currentWorld = null;
  State.data = null;
  State.currentItem = null;
  _chrome();
  buildSidebar();
  renderGallery();
}

function goProfile(userId) {
  State.currentView = 'profile';
  State.currentWorld = null;
  State.data = null;
  State.currentItem = null;
  State.profileViewing = userId || window.Auth?.getUser()?.id || null;
  _chrome();
  buildSidebar();
  renderProfile(State.profileViewing);
}

function goNewWorld() {
  State.currentView = 'new-world';
  State.currentWorld = null;
  State.data = null;
  State.currentItem = null;
  _chrome();
  buildSidebar();
  renderWorldForm('create');
}

// Open a world by id (always starts in view mode).
async function openWorld(id) {
  const content = UI.get('main-content');
  content.innerHTML = '<p style="color:var(--text-muted);padding:12px">Loading world…</p>';

  const world = await Cloud.getWorld(id);
  if (!world) { alert('World not found or not accessible.'); return goGallery(); }

  // Guard against an empty/legacy data blob.
  if (!world.data || !world.data.groups) world.data = Cloud.blankWorldData();

  State.currentWorld = world;
  State.data = world.data;
  State.editMode = false;
  State.currentView = 'home';
  State.currentItem = null;
  _chrome();
  buildSidebar();
  renderCurrentView();
}

function openWorldSettings() {
  if (!isOwner()) return;
  State.currentView = 'world-settings';
  State.currentItem = null;
  _chrome();
  buildSidebar();
  renderWorldForm('edit');
}

/* ── Within-world navigation ──────────────────────────────────── */

function navigate(slug) {
  State.currentView = slug;
  State.currentItem = null;
  _chrome();
  buildSidebar();
  renderCurrentView();
}

function navigateToItem(groupSlug, itemIndex) {
  State.currentView = groupSlug;
  State.currentItem = { groupSlug, itemIndex };
  _chrome();
  buildSidebar();
  renderDetailView();
}

function navigateToNewItem(groupSlug) {
  navigateToItem(groupSlug, null);
}

/* ── Topbar chrome: path label + which controls are visible ───── */

function _chrome() {
  const inWorld = !!State.currentWorld;
  const owner   = isOwner();
  const show = (id, on) => { const el = UI.get(id); if (el) el.style.display = on ? '' : 'none'; };

  // Two distinct shells: a "social" space (gallery/profile) and an immersive
  // "world" space (reading/editing). CSS keys off these body classes.
  document.body.classList.toggle('mode-world', inWorld);
  document.body.classList.toggle('mode-social', !inWorld);

  show('breadcrumb',      inWorld);
  show('search-input',    inWorld);
  show('mode-toggle',     inWorld && owner);
  show('world-menu-wrap', inWorld);
  show('btn-world-settings', owner);  // items inside the world-actions menu
  show('btn-import',         owner);  // export stays available to viewers
  show('btn-new-group',   inWorld && owner && State.editMode);

  _syncModeToggle();
  _renderUserMenu();
  _setBreadcrumb();
}

function _setBreadcrumb() {
  const el = UI.get('breadcrumb');
  if (!el) return;
  let path;
  if (!State.currentWorld) {
    path = State.currentView === 'profile'   ? 'Profile'
         : State.currentView === 'new-world' ? 'New World' : 'Gallery';
  } else {
    path = State.currentWorld.title || 'World';
    const group = getGroup(State.currentView);
    const sub = State.currentView === 'home'           ? 'Home'
              : State.currentView === 'new-group'      ? 'New Group'
              : State.currentView === 'world-settings' ? 'Settings'
              : (group?.name || State.currentView);
    path += '  ›  ' + sub;
    if (State.currentItem) {
      const { groupSlug, itemIndex } = State.currentItem;
      const item = itemIndex !== null ? getGroup(groupSlug)?.items[itemIndex] : null;
      path += '  ›  ' + (item?.name || 'New Item');
    }
  }
  el.textContent = path;
}

/* ── Render the active within-world view ──────────────────────── */

function renderCurrentView() {
  if (State.currentView === 'world-settings') { renderWorldForm('edit'); return; }
  if (State.currentItem) { renderDetailView(); return; }
  if (State.currentView === 'home') { renderHome(); return; }
  if (State.currentView === 'new-group') { renderNewGroupView(); return; }
  const group = getGroup(State.currentView);
  if (!group) return;
  if (group.type === 'graph')     renderGraph(group);
  else if (group.type === 'text') renderTextGroup(group);
  else                            renderList(group);
}
