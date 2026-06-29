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

// Languages a world's text can be written in (required category).
const LANGUAGES = [
  { code: 'en', label: 'English' },  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },   { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },{ code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' }, { code: 'zh', label: 'Chinese' },
  { code: 'ru', label: 'Russian' },  { code: 'ar', label: 'Arabic' },
  { code: 'other', label: 'Other' },
];
function languageLabel(code) { return (LANGUAGES.find(l => l.code === code) || {}).label || code || '—'; }

// "2h", "3d", "just now" — compact relative time from an ISO timestamp.
function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return Math.floor(s / 60) + 'm';
  if (s < 86400)  return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return Math.floor(s / 604800) + 'w';
}

// Per-user "last time the feed was viewed", for the "new" badges.
function _feedSeenKey() { return 'wb:feedSeen:' + (window.Auth?.getUser()?.id || ''); }
function getFeedSeen()  { return +(localStorage.getItem(_feedSeenKey()) || 0); }
function setFeedSeen(ts){ localStorage.setItem(_feedSeenKey(), String(ts)); }

function refDisplay(r) { const i = r.indexOf(':'); return i >= 0 ? r.slice(0, i) : r; }
function refKey(r)     { const i = r.indexOf(':'); return i >= 0 ? r.slice(i+1) : r; }

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
