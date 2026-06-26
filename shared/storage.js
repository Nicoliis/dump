/**
 * Nicotols shared storage module — hybrid localStorage + Supabase.
 *
 * - Not logged in → localStorage only (same as before, export/import still works)
 * - Logged in     → localStorage as fast cache, Supabase as source of truth
 *                   writes go to both; on first login data is pulled from cloud
 *
 * API (unchanged — existing tools need no edits):
 *   const store = Storage('yugioh');
 *   store.set('collection', [...]);
 *   const data = store.get('collection', []);
 *   await store.sync();           // pull from Supabase (called automatically on login)
 *   store.exportFile();           // downloads nicotols-yugioh-YYYY-MM-DD.json
 *   await store.importFile();     // opens file picker, loads JSON (+ pushes to cloud if logged in)
 */

function Storage(namespace) {
  const prefix = `nicotols:${namespace}:`;

  /* ── localStorage helpers ── */

  function lsKey(k) { return prefix + k; }

  function get(k, fallback = null) {
    try {
      const raw = localStorage.getItem(lsKey(k));
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function _lsSet(k, value) {
    try { localStorage.setItem(lsKey(k), JSON.stringify(value)); }
    catch (e) { console.error('Storage.lsSet failed:', e); }
  }

  function remove(k) {
    localStorage.removeItem(lsKey(k));
    _cloudDelete(k).catch(() => {});
  }

  function clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  }

  function dump() {
    const result = {};
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => {
        try { result[k.slice(prefix.length)] = JSON.parse(localStorage.getItem(k)); }
        catch { result[k.slice(prefix.length)] = localStorage.getItem(k); }
      });
    return result;
  }

  /* ── Supabase helpers ── */

  function _db() {
    const client = window.Auth?.getClient();
    if (!client) return null;
    return client.from('tool_data');
  }

  function _uid() { return window.Auth?.getUser()?.id ?? null; }

  async function _cloudSet(k, value) {
    const db = _db();
    const uid = _uid();
    if (!db || !uid) return;
    await db.upsert(
      { user_id: uid, tool: namespace, key: k, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,tool,key' }
    );
  }

  async function _cloudDelete(k) {
    const db = _db();
    const uid = _uid();
    if (!db || !uid) return;
    await db.delete().eq('user_id', uid).eq('tool', namespace).eq('key', k);
  }

  /* ── Public set: writes localStorage + cloud ── */

  async function set(k, value) {
    _lsSet(k, value);
    await _cloudSet(k, value);
  }

  /* ── Sync: pull all keys for this tool from Supabase into localStorage ── */

  async function sync() {
    const db = _db();
    const uid = _uid();
    if (!db || !uid) return { synced: 0 };
    const { data, error } = await db
      .select('key, value')
      .eq('user_id', uid)
      .eq('tool', namespace);
    if (error) { console.error('Storage.sync error:', error); return { synced: 0 }; }
    (data ?? []).forEach(row => _lsSet(row.key, row.value));
    return { synced: (data ?? []).length };
  }

  /* ── Export / Import (file) ── */

  function exportFile() {
    const data = { _tool: namespace, _exported: new Date().toISOString(), ...dump() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nicotols-${namespace}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return reject(new Error('No file selected'));
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const { _tool, _exported, ...entries } = data;
          for (const [k, v] of Object.entries(entries)) {
            await set(k, v); // writes local + cloud
          }
          resolve({ imported: Object.keys(entries).length, tool: _tool, exported: _exported });
        } catch (e) {
          reject(new Error('Invalid file: ' + e.message));
        }
      };
      input.click();
    });
  }

  return { get, set, remove, clear, dump, sync, exportFile, importFile };
}

window.Storage = Storage;
