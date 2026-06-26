function buildSidebar() {
  const menu = UI.get('menu');
  menu.innerHTML = '';

  const coreSection = UI.make('div').class('menu-section');
  coreSection.withChilds(UI.make('h3').text('Core'));
  coreSection.withChilds(makeMenuItem('Home', 'home'));
  menu.appendChild(coreSection.getElement());

  if (!State.data.groups.length) return;

  const listGroups  = State.data.groups.filter(g => g.type === 'list');
  const graphGroups = State.data.groups.filter(g => g.type === 'graph');
  const textGroups  = State.data.groups.filter(g => g.type === 'text');

  if (listGroups.length) {
    const sec = UI.make('div').class('menu-section');
    sec.withChilds(UI.make('h3').text('Lists'));
    listGroups.forEach(g => sec.withChilds(makeMenuItem(g.name, g.slug)));
    menu.appendChild(sec.getElement());
  }

  if (graphGroups.length) {
    const sec = UI.make('div').class('menu-section');
    sec.withChilds(UI.make('h3').text('Graphs'));
    graphGroups.forEach(g => sec.withChilds(makeMenuItem(g.name, g.slug)));
    menu.appendChild(sec.getElement());
  }

  if (textGroups.length) {
    const sec = UI.make('div').class('menu-section');
    sec.withChilds(UI.make('h3').text('Texts'));
    textGroups.forEach(g => sec.withChilds(makeMenuItem(g.name, g.slug)));
    menu.appendChild(sec.getElement());
  }
}

function makeMenuItem(label, slug) {
  return UI.make('div')
    .class('menu-item', State.currentView === slug ? 'active' : '')
    .text(label)
    .on('click', () => navigate(slug));
}
