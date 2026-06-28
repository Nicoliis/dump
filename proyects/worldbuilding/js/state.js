const DEFAULT_GROUPS = [
  { name: 'Characters',  slug: 'characters',  type: 'list',  items: [] },
  { name: 'Locations',   slug: 'locations',   type: 'list',  items: [] },
  { name: 'Story Beats', slug: 'storybeats',  type: 'graph', items: [] },
];

const State = {
  data: {
    home:   { content: '# Welcome to StoryForge\n\nStart building your universe here.' },
    groups: DEFAULT_GROUPS.map(g => ({ ...g, items: [] })),
  },
  currentView: 'home',
  currentItem: null,   // { groupSlug, itemIndex } or null
  editMode: false,
};
