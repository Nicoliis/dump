// Helpers shared across views. Persistence now lives in cloud.js (per-world rows).

// Save the currently open world's content back to Supabase.
// State.data is the same object reference as State.currentWorld.data, so edits
// to groups/home are already reflected — we just push the row.
function saveData() {
  if (!State.currentWorld) return;
  State.currentWorld.data = State.data;
  Cloud.saveWorld(State.currentWorld).catch(e => console.error('Cloud save failed', e));
}

// True when the signed-in user owns the open world (gates edit mode / writes).
function isOwner() {
  const uid = window.Auth?.getUser()?.id;
  return !!(State.currentWorld && uid && State.currentWorld.owner_id === uid);
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function getGroup(slug) {
  return State.data?.groups.find(g => g.slug === slug) || null;
}

// Parse a comma-separated tag string into a clean, de-duplicated array.
function parseTags(str) {
  return [...new Set((str || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean))];
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
