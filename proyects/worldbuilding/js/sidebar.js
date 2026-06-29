function buildSidebar() {
  const menu = UI.get('menu');
  const logo = document.querySelector('.logo');
  menu.innerHTML = '';

  // ── Gallery / profile chrome (no world open) ──
  if (!State.currentWorld) {
    logo.textContent = 'StoryForge';
    const sec = UI.make('div').class('menu-section');
    sec.withChilds(UI.make('h3').text('Browse'));
    sec.withChilds(_sideItem('gallery', 'Gallery',    'gallery',   () => goGallery()));
    sec.withChilds(_sideItem('user',    'My Profile', 'profile',   () => goProfile()));
    sec.withChilds(_sideItem('plus',    'New World',  'new-world', () => goNewWorld()));
    menu.appendChild(sec.getElement());
    return;
  }

  // ── Inside a world ──
  logo.textContent = State.currentWorld.title || 'World';

  const top = UI.make('div').class('menu-section');
  top.withChilds(_sideItem('back', 'Back to Gallery', null, () => goGallery()));
  menu.appendChild(top.getElement());

  const coreSection = UI.make('div').class('menu-section');
  coreSection.withChilds(UI.make('h3').text('Core'));
  coreSection.withChilds(makeMenuItem('Home', 'home'));
  menu.appendChild(coreSection.getElement());

  const groups = State.data?.groups || [];
  _groupSection(menu, 'Lists',  groups.filter(g => g.type === 'list'));
  _groupSection(menu, 'Graphs', groups.filter(g => g.type === 'graph'));
  _groupSection(menu, 'Texts',  groups.filter(g => g.type === 'text'));
}

function _groupSection(menu, title, groups) {
  if (!groups.length) return;
  const sec = UI.make('div').class('menu-section');
  sec.withChilds(UI.make('h3').text(title));
  groups.forEach(g => sec.withChilds(makeMenuItem(g.name, g.slug)));
  menu.appendChild(sec.getElement());
}

function makeMenuItem(label, slug) {
  const item = UI.make('div')
    .class('menu-item', State.currentView === slug ? 'active' : '')
    .on('click', () => navigate(slug))
    .withChilds(UI.make('span').text(label));

  const unseen = slug === 'home' ? homeHasUnseen()
               : (() => { const g = getGroup(slug); return g ? groupHasUnseen(g) : false; })();
  if (unseen) item.withChilds(UI.make('span').class('menu-dot').attrs({ title: 'New updates' }));
  return item;
}

// Sidebar nav entry for top-level destinations (gallery/profile/new world/back).
function _sideItem(icon, label, activeView, onClick) {
  return UI.make('div')
    .class('menu-item', activeView && State.currentView === activeView ? 'active' : '')
    .innerHTML(Icons.label(icon, label))
    .on('click', onClick);
}
