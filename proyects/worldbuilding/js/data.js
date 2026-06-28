// Shared hybrid store: localStorage cache + Supabase cloud (when logged in).
const store = Storage('worldbuilding');

function loadData() {
  const saved = store.get('data', null);   // sync read from localStorage cache
  if (!saved) return;
  if (saved.home)   State.data.home   = saved.home;
  if (saved.groups) State.data.groups = saved.groups;
}

function saveData() {
  // Writes localStorage immediately + pushes to Supabase in the background.
  store.set('data', State.data).catch(e => console.error('Cloud save failed', e));
}

// Pull cloud data into the local cache, then refresh State. Called on login.
async function syncData() {
  await store.sync();
  loadData();
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function getGroup(slug) {
  return State.data.groups.find(g => g.slug === slug) || null;
}

function refDisplay(r) { const i = r.indexOf(':'); return i >= 0 ? r.slice(0, i) : r; }
function refKey(r)     { const i = r.indexOf(':'); return i >= 0 ? r.slice(i+1) : r; }

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
