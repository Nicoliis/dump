/* Landing page: every public world + the viewer's own, with tag/text filtering. */

let _galleryFilter = { text: '', tag: null };

async function renderGallery() {
  const content = UI.get('main-content');
  content.innerHTML = '<p style="color:var(--text-muted);padding:12px">Loading worlds…</p>';

  State.worlds = await Cloud.listGallery();
  _drawGallery();
}

function _drawGallery() {
  const content = UI.get('main-content');
  content.innerHTML = '';
  const uid = window.Auth?.getUser()?.id;

  const wrap = UI.make('div').class('gallery');

  // Header
  wrap.withChilds(
    UI.make('div').class('gallery-head').withChilds(
      UI.make('h1').text('Worlds'),
      UI.make('button').class('btn-primary').innerHTML(Icons.label('plus', 'New World')).on('click', () => goNewWorld())
    )
  );

  // Filters
  const allTags = [...new Set(State.worlds.flatMap(w => w.tags || []))].sort();
  const searchInput = UI.make('input').class('field-input').attrs({ placeholder: 'Search worlds…' })
    .value(_galleryFilter.text)
    .on('input', e => { _galleryFilter.text = e.target.value.toLowerCase(); _drawGrid(grid); });

  const tagBar = UI.make('div').class('tag-filter');
  const mkTag = (label, value) =>
    UI.make('span').class('tag-chip', _galleryFilter.tag === value ? 'tag-chip--on' : '')
      .text(label).on('click', () => { _galleryFilter.tag = value; _drawGallery(); });
  tagBar.withChilds(mkTag('All', null));
  allTags.forEach(t => tagBar.withChilds(mkTag('#' + t, t)));

  wrap.withChilds(
    UI.make('div').class('gallery-filters').withChilds(searchInput),
    tagBar
  );

  const grid = UI.make('div').class('world-grid');
  wrap.withChilds(grid);
  content.appendChild(wrap.getElement());

  _drawGrid(grid);

  function _drawGrid(gridBuilder) {
    const el = gridBuilder.getElement();
    el.innerHTML = '';
    const worlds = State.worlds.filter(w => {
      if (_galleryFilter.tag && !(w.tags || []).includes(_galleryFilter.tag)) return false;
      if (_galleryFilter.text) {
        const hay = (w.title + ' ' + (w.description || '')).toLowerCase();
        if (!hay.includes(_galleryFilter.text)) return false;
      }
      return true;
    });

    if (!worlds.length) {
      el.appendChild(UI.make('p').style({ color: 'var(--text-muted)', padding: '12px' })
        .text('No worlds match. Create one to get started!').getElement());
      return;
    }
    worlds.forEach(w => el.appendChild(_worldCard(w, uid)));
  }
}

function _worldCard(w, uid) {
  const card = UI.make('div').class('world-card').on('click', () => openWorld(w.id));

  const head = UI.make('div').class('world-card-head').withChilds(
    UI.make('h3').class('world-card-title').text(w.title)
  );
  if (w.owner_id === uid && !w.is_public) head.withChilds(UI.make('span').class('badge-private').text('Private'));
  card.withChilds(head);

  if (w.description) card.withChilds(UI.make('p').class('item-preview').text(w.description));

  if ((w.tags || []).length) {
    const tags = UI.make('div').class('world-tags');
    w.tags.forEach(t => tags.withChilds(UI.make('span').class('tag-chip').text('#' + t)));
    card.withChilds(tags);
  }

  card.withChilds(_authorRow(w.author, w.owner_id));
  return card.getElement();
}

// Small avatar + name row; clicking opens that author's profile.
function _authorRow(author, ownerId) {
  const name = author?.display_name || author?.username || 'Unknown';
  const row = UI.make('div').class('author-row')
    .on('click', e => { e.stopPropagation(); goProfile(ownerId); });
  if (author?.avatar_url) {
    row.withChilds(UI.make('img').class('avatar').attrs({ src: author.avatar_url, alt: name }));
  } else {
    row.withChilds(UI.make('span').class('avatar', 'avatar--initial').text(name[0].toUpperCase()));
  }
  row.withChilds(UI.make('span').class('author-name').text(name));
  return row;
}
