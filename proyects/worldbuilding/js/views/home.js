function renderHome() {
  const content = UI.get('main-content');
  content.innerHTML = '';
  let homeValue = State.data.home.content;

  const wrap = UI.make('div').class('detail-view');
  wrap.withChilds(_worldHeader());
  wrap.withChilds(UI.make('div').execute(el =>
    el.appendChild(makeMdPanel(homeValue, val => { homeValue = val; }))
  ));

  if (State.editMode) {
    wrap.withChilds(
      UI.make('button').class('btn-primary').text('Save Home')
        .style({ marginTop: '14px' })
        .on('click', () => { State.data.home.content = homeValue; saveData(); })
    );
  }

  content.appendChild(wrap.getElement());
}

// Title + author + follower count + follow actions (for non-owners) at the top of a world.
function _worldHeader() {
  const w = State.currentWorld;
  const author = w?.author || {};
  const name = author.display_name || author.username || 'Unknown';
  const owner = isOwner();

  const header = UI.make('div').class('world-header');
  header.withChilds(UI.make('h1').class('world-header-title').text(w?.title || 'Your Universe'));

  const sub = UI.make('div').class('world-header-sub');
  // author chip → profile
  const chip = UI.make('div').class('author-row').on('click', () => goProfile(w.owner_id));
  chip.withChilds(author.avatar_url
    ? UI.make('img').class('avatar').attrs({ src: author.avatar_url, alt: name })
    : UI.make('span').class('avatar', 'avatar--initial').text(name[0].toUpperCase()));
  chip.withChilds(UI.make('span').class('author-name').text(name));
  sub.withChilds(chip);

  const count = UI.make('span').class('muted world-followers').text('');
  sub.withChilds(count);
  Cloud.worldFollowerCount(w.id).then(n =>
    count.getElement().textContent = n ? `${n} ${n === 1 ? 'follower' : 'followers'}` : '');

  if (!owner) {
    const actions = UI.make('div').class('world-header-actions');
    actions.withChilds(followWorldButton(w.id));
    const fu = followUserButton(w.owner_id);
    if (fu) actions.withChilds(fu);
    sub.withChilds(actions);
  }

  header.withChilds(sub);
  return header;
}
