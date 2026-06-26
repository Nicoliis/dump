function renderHome() {
  const content = UI.get('main-content');
  content.innerHTML = '';
  let homeValue = State.data.home.content;

  const wrap = UI.make('div').class('detail-view');
  wrap.withChilds(UI.make('h1').text('Your Universe').style({ marginBottom: '20px', fontSize: '32px' }));
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
