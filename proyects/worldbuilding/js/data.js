function loadData() {
  const raw = localStorage.getItem('storyforge_data');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.home)   State.data.home   = parsed.home;
    if (parsed.groups) State.data.groups = parsed.groups;
  } catch (e) { console.error('Load failed', e); }
}

function saveData() {
  localStorage.setItem('storyforge_data', JSON.stringify(State.data));
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
