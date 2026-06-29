/**
 * Group settings, the index-structure editor, and the "menu" (folder) landing
 * view. All owner-only (gated by State.editMode / isOwner at the call sites).
 *
 * Group objects gained optional fields (additive, persisted by saveWorld):
 *   intro        markdown shown above a group's items / text
 *   itemTemplate default body for new items (list/graph only)
 *   isPublic     false → hidden from non-owners (UI-level; see note below)
 *   parentId     parent menu's slug, or null/absent for top level
 *   type:'menu'  a folder node with no content of its own
 *
 * PRIVACY NOTE: isPublic hides a node in the UI only. A public world's full
 * `data` jsonb is readable under RLS, so private content is still reachable via
 * the raw API. This matches "hide WIP sections from readers"; it is NOT hard
 * security (that would need a separate owner-only table).
 */

/* ── Per-group settings ───────────────────────────────────────── */

function renderGroupSettings(group) {
  const content = UI.get('main-content');
  content.innerHTML = '';
  if (!group) { navigate('home'); return; }

  const isMenu = group.type === 'menu';
  const hasItems = group.type === 'list' || group.type === 'graph';

  const name = UI.make('input').class('detail-name-input')
    .value(group.name || '').attrs({ placeholder: 'Group name…' });

  const intro = UI.make('textarea').class('field-input')
    .value(group.intro || '').attrs({ placeholder: 'Text shown above this group…', rows: '3' });

  const template = UI.make('textarea').class('field-input')
    .value(group.itemTemplate || '').attrs({ placeholder: '# {{name}}\n\nDefault body for each new entry…', rows: '5' });

  const publicToggle = UI.make('input').ofType('checkbox')
    .execute(el => { el.checked = group.isPublic !== false; });
  const visRow = UI.make('label').class('switch-row').withChilds(
    publicToggle,
    UI.make('span').text('Public — visible to anyone viewing this world')
  );

  // Parent menu: any menu node that isn't this node or one of its descendants.
  const blocked = new Set(groupDescendantSlugs(group.slug));
  const menus = (State.data.groups || []).filter(g => g.type === 'menu' && !blocked.has(g.slug));
  const parentSel = UI.make('select').class('field-input').execute(sel => {
    sel.appendChild(new Option('— Top level —', ''));
    menus.forEach(m => sel.appendChild(new Option(m.name, m.slug)));
    sel.value = group.parentId || '';
  });

  function save() {
    const n = name.getElement().value.trim();
    if (!n) { alert('Name is required'); return; }
    group.name = n;
    group.isPublic = publicToggle.getElement().checked;
    group.parentId = parentSel.getElement().value || null;
    if (!isMenu) group.intro = intro.getElement().value;
    if (hasItems) group.itemTemplate = template.getElement().value;
    saveData();
    buildSidebar();
    navigate(group.slug);
  }

  const bar = UI.make('div').class('detail-bar').withChilds(
    UI.make('button').class('btn-secondary').innerHTML(Icons.label('back', 'Back'))
      .on('click', () => navigate(isMenu ? 'home' : group.slug)),
    UI.make('button').class('btn-primary').text('Save').on('click', save)
  );

  const wrap = UI.make('div').class('detail-view').withChilds(
    bar,
    UI.make('h1').class('detail-title').text('Group settings'),
    name,
    UI.make('div').class('field-group').style({ marginTop: '16px' })
      .withChilds(UI.make('label').text('Visibility'), visRow),
    UI.make('div').class('field-group').withChilds(UI.make('label').text('Inside menu'), parentSel)
  );

  if (!isMenu)
    wrap.withChilds(UI.make('div').class('field-group')
      .withChilds(UI.make('label').text('Intro text (shown above the group)'), intro));
  if (hasItems)
    wrap.withChilds(UI.make('div').class('field-group')
      .withChilds(UI.make('label').text('New-item template (pre-fills each new entry)'), template));

  // Reference token the writer can drop into any markdown body.
  const token = `#${group.name}:${group.slug}#`;
  wrap.withChilds(
    UI.make('div').class('field-group').withChilds(
      UI.make('label').text('Reference this group'),
      UI.make('input').class('field-input').attrs({ readonly: 'readonly', value: token })
        .on('focus', e => e.target.select())
    )
  );

  // Danger zone — delete (children, if any, are lifted to this node's parent).
  wrap.withChilds(
    UI.make('div').style({ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }).withChilds(
      UI.make('button').class('btn-danger').innerHTML(Icons.label('trash', 'Delete group'))
        .on('click', () => _deleteGroup(group))
    )
  );

  content.appendChild(wrap.getElement());
  name.getElement().focus();
}

function _deleteGroup(group) {
  const kids = groupChildren(group.slug);
  const msg = kids.length
    ? `Delete "${group.name}"? Its ${kids.length} child item(s) will move up one level.`
    : `Delete "${group.name}"?`;
  if (!confirm(msg)) return;
  kids.forEach(c => { c.parentId = group.parentId || null; });
  const i = State.data.groups.indexOf(group);
  if (i !== -1) State.data.groups.splice(i, 1);
  saveData();
  buildSidebar();
  navigate('home');
}

/* ── Index structure editor (order + nesting + visibility) ────── */

function renderIndexEditor() {
  const content = UI.get('main-content');
  content.innerHTML = '';

  const wrap = UI.make('div').class('detail-view');
  wrap.withChilds(
    UI.make('div').class('detail-bar').withChilds(
      UI.make('button').class('btn-secondary').innerHTML(Icons.label('back', 'Back')).on('click', () => navigate('home'))
    ),
    UI.make('h1').class('detail-title').text('Edit index'),
    UI.make('p').class('item-meta').text('Reorder, nest under menus, and set what readers can see.')
  );

  const list = UI.make('div').class('index-editor');
  const rows = flattenGroupTree();
  if (!rows.length)
    list.withChilds(UI.make('p').style({ color: 'var(--text-muted)' }).text('No groups yet.'));

  rows.forEach(({ group, depth }) => {
    const siblings = groupChildren(group.parentId || null);
    const pos = siblings.indexOf(group);
    const prev = siblings[pos - 1];

    const row = UI.make('div').class('index-row').style({ marginLeft: (depth * 22) + 'px' });

    const icon = UI.make('span').class('ic', 'index-type').innerHTML(Icons.get(groupTypeIcon(group)));
    const label = UI.make('span').class('index-name').text(group.name);
    if (group.isPublic === false) label.withChilds(UI.make('span').class('index-private').text('private'));

    const open = UI.make('button').class('idx-btn').innerHTML(Icons.label('settings', '')).attrs({ title: 'Settings' })
      .on('click', () => openGroupSettings(group.slug));

    const actions = UI.make('div').class('index-actions').withChilds(
      _idxBtn('↑', 'Move up',      pos > 0,                   () => { _swapSiblings(group, -1); renderIndexEditor(); }),
      _idxBtn('↓', 'Move down',    pos < siblings.length - 1, () => { _swapSiblings(group, 1);  renderIndexEditor(); }),
      _idxBtn('→', 'Nest under previous menu', !!prev && prev.type === 'menu', () => { _indent(group, prev); renderIndexEditor(); }),
      _idxBtn('←', 'Move out one level',       !!group.parentId,               () => { _outdent(group); renderIndexEditor(); }),
      _idxBtn(group.isPublic === false ? 'Show' : 'Hide', 'Toggle public', true, () => {
        group.isPublic = group.isPublic === false; saveData(); buildSidebar(); renderIndexEditor();
      }),
      open
    );

    row.withChilds(UI.make('span').class('index-label').withChilds(icon, label), actions);
    list.withChilds(row);
  });

  wrap.withChilds(list);
  content.appendChild(wrap.getElement());
}

function _idxBtn(glyph, title, enabled, onClick) {
  const b = UI.make('button').class('idx-btn').attrs({ title, type: 'button' }).text(glyph);
  if (!enabled) b.attrs({ disabled: 'disabled' });
  else b.on('click', onClick);
  return b;
}

// Swap a node with its previous/next sibling inside data.groups (dir = -1 | +1).
function _swapSiblings(group, dir) {
  const siblings = groupChildren(group.parentId || null);
  const pos = siblings.indexOf(group);
  const other = siblings[pos + dir];
  if (!other) return;
  const arr = State.data.groups;
  const a = arr.indexOf(group), b = arr.indexOf(other);
  [arr[a], arr[b]] = [arr[b], arr[a]];
  saveData(); buildSidebar();
}

// Nest a node under the menu immediately above it; place it right after that menu.
function _indent(group, prevMenu) {
  group.parentId = prevMenu.slug;
  _moveAfter(group, prevMenu);
  saveData(); buildSidebar();
}

// Lift a node to its grandparent; place it right after its old parent.
function _outdent(group) {
  const parent = group.parentId ? getGroup(group.parentId) : null;
  if (!parent) return;
  group.parentId = parent.parentId || null;
  _moveAfter(group, parent);
  saveData(); buildSidebar();
}

function _moveAfter(group, ref) {
  const arr = State.data.groups;
  arr.splice(arr.indexOf(group), 1);
  arr.splice(arr.indexOf(ref) + 1, 0, group);
}

/* ── Menu (folder) landing view ───────────────────────────────── */

function renderMenu(group) {
  const content = UI.get('main-content');
  content.innerHTML = '';
  const wrap = UI.make('div').class('detail-view');

  const bar = UI.make('div').class('detail-bar').withChilds(
    UI.make('button').class('btn-secondary').innerHTML(Icons.label('back', 'Back')).on('click', () => navigate('home'))
  );
  if (State.editMode)
    bar.withChilds(UI.make('button').class('btn-secondary').innerHTML(Icons.label('settings', 'Settings'))
      .on('click', () => openGroupSettings(group.slug)));
  wrap.withChilds(bar, UI.make('h1').text(group.name));

  if (group.intro) wrap.withChilds(UI.make('div').execute(el => {
    el.className = 'preview-only';
    el.innerHTML = renderMarkdown(group.intro);
    bindRefLinks(el);
  }));

  const kids = groupChildren(group.slug).filter(isGroupVisible);
  const grid = UI.make('div').class('list-view');
  if (!kids.length)
    grid.withChilds(UI.make('p').style({ color: 'var(--text-muted)', padding: '12px' }).text('This menu is empty.'));
  kids.forEach(k =>
    grid.withChilds(UI.make('div').class('item-card').withChilds(
      UI.make('span').class('ic').innerHTML(Icons.get(groupTypeIcon(k))),
      UI.make('span').text(k.name)
    ).on('click', () => navigate(k.slug)))
  );
  wrap.withChilds(grid);
  content.appendChild(wrap.getElement());
}

/* ── Shared bits used by the list/graph/text views ───────────── */

// Title row with an edit-mode "Settings" button (list/graph use this).
function groupHeader(group) {
  const row = UI.make('div').class('group-head').withChilds(UI.make('h1').text(group.name));
  if (State.editMode && isOwner()) row.withChilds(groupSettingsBtn(group));
  return row;
}

function groupSettingsBtn(group) {
  return UI.make('button').class('btn-secondary', 'btn-sm')
    .innerHTML(Icons.label('settings', 'Settings'))
    .on('click', () => openGroupSettings(group.slug));
}

// Rendered intro markdown shown above a group's body, or null when empty.
function groupIntroEl(group) {
  if (!group || !group.intro) return null;
  const el = document.createElement('div');
  el.className = 'preview-only group-intro';
  el.innerHTML = renderMarkdown(group.intro);
  bindRefLinks(el);
  return el;
}

/* ── Shared: which type icon a group uses ─────────────────────── */
function groupTypeIcon(group) {
  return group.type === 'menu'  ? 'type-menu'
       : group.type === 'graph' ? 'type-graph'
       : group.type === 'text'  ? 'type-text'
       : 'type-list';
}
