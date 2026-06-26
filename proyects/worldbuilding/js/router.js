function navigate(slug) {
  State.currentView = slug;
  State.currentItem = null;
  _updatePath();
  buildSidebar();
  renderCurrentView();
}

function navigateToItem(groupSlug, itemIndex) {
  State.currentView = groupSlug;
  State.currentItem = { groupSlug, itemIndex };
  _updatePath();
  buildSidebar();
  renderDetailView();
}

function navigateToNewItem(groupSlug) {
  navigateToItem(groupSlug, null);
}

function _updatePath() {
  const group = getGroup(State.currentView);
  let path = State.currentView === 'home'      ? 'Home'
           : State.currentView === 'new-group' ? 'New Group'
           : (group?.name || State.currentView);
  if (State.currentItem) {
    const { groupSlug, itemIndex } = State.currentItem;
    const item = itemIndex !== null ? getGroup(groupSlug)?.items[itemIndex] : null;
    path += ' › ' + (item?.name || 'New Item');
  }
  UI.get('current-path').textContent = path;
}

function renderCurrentView() {
  if (State.currentItem) { renderDetailView(); return; }
  if (State.currentView === 'home') { renderHome(); return; }
  if (State.currentView === 'new-group') { renderNewGroupView(); return; }
  const group = getGroup(State.currentView);
  if (!group) return;
  if (group.type === 'graph')     renderGraph(group);
  else if (group.type === 'text') renderTextGroup(group);
  else                            renderList(group);
}
