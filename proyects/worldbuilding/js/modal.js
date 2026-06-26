let _modalRefs = null;
let _mdValue   = '';

function openModal(groupSlug, itemIndex) {
  const group  = getGroup(groupSlug);
  const isNew  = itemIndex === null;
  const item   = isNew ? { name: '', references: [], content: '', parents: [] } : group.items[itemIndex];

  State.modal.groupSlug  = groupSlug;
  State.modal.itemIndex  = itemIndex;

  UI.get('modal-title').textContent = isNew ? 'New ' + (group.name.replace(/s$/, '') || 'Item') : item.name;
  UI.get('modal-save').style.display   = State.editMode ? '' : 'none';
  UI.get('modal-delete').style.display = (!isNew && State.editMode) ? '' : 'none';

  const body = UI.get('modal-body');
  body.innerHTML = '';
  _mdValue = item.content || '';

  if (!State.editMode) {
    body.appendChild(makeMdPanel(_mdValue, null));
  } else {
    _modalRefs = makeRefEditor(item.references);
    const nameInput = UI.make('input').class('field-input').id('modal-name').value(item.name).attrs({ placeholder: 'Name' });
    const fields = UI.make('div').class('modal-fields');
    fields.withChilds(
      UI.make('div').class('field-group').withChilds(UI.make('label').text('Name'), nameInput),
      UI.make('div').class('field-group').withChilds(UI.make('label').text('References'), UI.make('div').execute(el => el.appendChild(_modalRefs.element)))
    );
    if (group.type === 'graph') {
      const pi = UI.make('input').class('field-input').id('modal-parents').value((item.parents||[]).join(', ')).attrs({ placeholder: 'Parent beats, comma separated' });
      fields.withChilds(UI.make('div').class('field-group').withChilds(UI.make('label').text('Parent Beats'), pi));
    }
    body.appendChild(fields.getElement());
    body.appendChild(makeMdPanel(_mdValue, val => { _mdValue = val; }));
  }

  UI.get('modal').style.display = 'flex';
}

function closeModal() {
  UI.get('modal').style.display = 'none';
  State.modal.groupSlug = null;
  State.modal.itemIndex = null;
  _modalRefs = null;
}

function saveModal() {
  const name = (UI.get('modal-name')?.value || '').trim();
  if (!name) { alert('Name is required'); return; }

  const group = getGroup(State.modal.groupSlug);
  const isNew = State.modal.itemIndex === null;
  const item  = isNew ? { id: generateId() } : group.items[State.modal.itemIndex];

  item.name       = name;
  item.content    = _mdValue;
  item.references = _modalRefs ? _modalRefs.getRefs() : (item.references || []);

  if (group.type === 'graph') {
    const raw = UI.get('modal-parents')?.value || '';
    item.parents = raw.split(',').map(p => p.trim()).filter(Boolean);
  }

  if (isNew) group.items.push(item);
  saveData();
  closeModal();
  renderCurrentView();
}

function deleteModalItem() {
  const group = getGroup(State.modal.groupSlug);
  if (!group || State.modal.itemIndex === null) return;
  if (!confirm('Delete "' + group.items[State.modal.itemIndex].name + '"?')) return;
  group.items.splice(State.modal.itemIndex, 1);
  saveData();
  closeModal();
  renderCurrentView();
}
