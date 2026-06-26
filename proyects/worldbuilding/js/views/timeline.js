function renderTimeline(group) {
  const content = UI.get('main-content');
  content.innerHTML = '';
  const wrap = UI.make('div').class('detail-view');

  wrap.withChilds(UI.make('h1').text(group.name));

  const track = UI.make('div').class('timeline-track');

  group.items.forEach((item, i) => {
    const card = UI.make('div').class('timeline-card').on('click', () => navigateToItem(group.slug, i));
    if (item.date) card.withChilds(UI.make('span').class('timeline-date').text(item.date));
    card.withChilds(UI.make('div').class('item-name').text(item.name));
    if (item.content)
      card.withChilds(UI.make('div').class('item-preview').text(item.content.replace(/[#*_`>\-]/g, '').substring(0, 120)));

    track.withChilds(
      UI.make('div').class('timeline-event').withChilds(
        UI.make('div').class('timeline-dot'),
        card
      )
    );
  });

  if (!group.items.length)
    track.withChilds(UI.make('p').style({ color: 'var(--text-muted)', paddingLeft: '8px' }).text('No events yet.'));

  if (State.editMode)
    track.withChilds(
      UI.make('div').class('timeline-event').withChilds(
        UI.make('div').class('timeline-dot', 'timeline-dot--new'),
        UI.make('div').class('timeline-card', 'new-item-card').text('+ New Event')
          .on('click', () => navigateToNewItem(group.slug))
      )
    );

  wrap.withChilds(track);
  content.appendChild(wrap.getElement());
}
