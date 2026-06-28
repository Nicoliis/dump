/**
 * Worldbuilding — cloud data layer (Supabase).
 *
 * Unlike the generic shared/storage.js (private per-user `tool_data`), the
 * social features need cross-user reads, so this talks to two dedicated tables
 * with their own RLS policies:
 *
 *   profiles(id, username, display_name, bio, avatar_url, favorite_tags[])   — public read
 *   worlds(id, owner_id, title, description, tags[], is_public, data jsonb)   — public-or-own read
 *
 * See supabase.sql for the schema. Requires shared/auth.js (window.Auth).
 */
const Cloud = (() => {
  function _db()  { return window.Auth?.getClient() ?? null; }
  function _uid() { return window.Auth?.getUser()?.id ?? null; }

  function blankWorldData() {
    return {
      home:   { content: '# New World\n\nStart building your universe here.' },
      groups: DEFAULT_GROUPS.map(g => ({ ...g, items: [] })),
    };
  }

  /* ── Profiles ─────────────────────────────────────────────── */

  // Fetch the signed-in user's profile, creating it from auth metadata if missing.
  async function ensureProfile() {
    const db = _db(); const user = window.Auth?.getUser();
    if (!db || !user) return null;

    const { data: existing } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (existing) return existing;

    const meta = user.user_metadata || {};
    const row = {
      id: user.id,
      username: meta.user_name || meta.preferred_username || (user.email || '').split('@')[0] || null,
      display_name: meta.full_name || meta.name || null,
      avatar_url: meta.avatar_url || null,
    };
    const { data, error } = await db.from('profiles').insert(row).select('*').maybeSingle();
    if (error) { console.error('ensureProfile', error); return row; }
    return data;
  }

  async function getProfile(id) {
    const db = _db(); if (!db || !id) return null;
    const { data, error } = await db.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) { console.error('getProfile', error); return null; }
    return data;
  }

  async function saveProfile(patch) {
    const db = _db(); const uid = _uid();
    if (!db || !uid) throw new Error('Not signed in');
    const { data, error } = await db.from('profiles').update(patch).eq('id', uid).select('*').maybeSingle();
    if (error) throw error;
    return data;
  }

  /* ── Worlds ───────────────────────────────────────────────── */

  const CARD_COLS = 'id,owner_id,title,description,tags,is_public,updated_at,author:profiles(username,display_name,avatar_url)';

  // Gallery: every public world plus the viewer's own (RLS enforces the same).
  async function listGallery() {
    const db = _db(); const uid = _uid();
    if (!db) return [];
    let q = db.from('worlds').select(CARD_COLS).order('updated_at', { ascending: false });
    q = uid ? q.or(`is_public.eq.true,owner_id.eq.${uid}`) : q.eq('is_public', true);
    const { data, error } = await q;
    if (error) { console.error('listGallery', error); return []; }
    return data || [];
  }

  // A single author's worlds. RLS hides others' private worlds automatically.
  async function listByOwner(ownerId) {
    const db = _db(); if (!db || !ownerId) return [];
    const { data, error } = await db.from('worlds').select(CARD_COLS)
      .eq('owner_id', ownerId).order('updated_at', { ascending: false });
    if (error) { console.error('listByOwner', error); return []; }
    return data || [];
  }

  async function getWorld(id) {
    const db = _db(); if (!db || !id) return null;
    const { data, error } = await db.from('worlds')
      .select('*, author:profiles(username,display_name,avatar_url)')
      .eq('id', id).maybeSingle();
    if (error) { console.error('getWorld', error); return null; }
    return data;
  }

  async function createWorld({ title, description = '', tags = [], is_public = false, data }) {
    const db = _db(); const uid = _uid();
    if (!db || !uid) throw new Error('Not signed in');
    const row = { owner_id: uid, title, description, tags, is_public, data: data || blankWorldData() };
    const { data: created, error } = await db.from('worlds').insert(row).select('*').maybeSingle();
    if (error) throw error;
    return created;
  }

  // Persist the open world (content edits + metadata). Fire-and-forget; logs on failure.
  async function saveWorld(world) {
    const db = _db(); const uid = _uid();
    if (!db || !uid || !world?.id) return;
    const { error } = await db.from('worlds').update({
      title: world.title,
      description: world.description,
      tags: world.tags,
      is_public: world.is_public,
      data: world.data,
      updated_at: new Date().toISOString(),
    }).eq('id', world.id);
    if (error) console.error('saveWorld failed', error);
  }

  async function deleteWorld(id) {
    const db = _db(); if (!db || !id) return;
    const { error } = await db.from('worlds').delete().eq('id', id);
    if (error) console.error('deleteWorld', error);
  }

  // Tags across an author's PUBLIC worlds, ranked by use count (the "multiplier").
  async function publishedTags(ownerId) {
    const db = _db(); if (!db || !ownerId) return [];
    const { data, error } = await db.from('worlds').select('tags')
      .eq('owner_id', ownerId).eq('is_public', true);
    if (error) { console.error('publishedTags', error); return []; }
    const counts = {};
    (data || []).forEach(w => (w.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /* ── One-time migration of the legacy single world ────────── */

  // Old versions stored one world in tool_data (tool='worldbuilding', key='data').
  // If the user has no worlds yet, lift that blob into its own private world row.
  async function migrateLegacy() {
    const db = _db(); const uid = _uid();
    if (!db || !uid) return null;

    const { data: existing } = await db.from('worlds').select('id').eq('owner_id', uid).limit(1);
    if (existing && existing.length) return null;

    const { data: legacy } = await db.from('tool_data')
      .select('value').eq('user_id', uid).eq('tool', 'worldbuilding').eq('key', 'data').maybeSingle();
    if (!legacy?.value || !legacy.value.groups) return null;

    return createWorld({
      title: 'My First World',
      description: 'Migrated from your original StoryForge world.',
      is_public: false,
      data: legacy.value,
    });
  }

  return {
    blankWorldData,
    ensureProfile, getProfile, saveProfile,
    listGallery, listByOwner, getWorld, createWorld, saveWorld, deleteWorld,
    publishedTags, migrateLegacy,
  };
})();

window.Cloud = Cloud;
