/**
 * Nicotols — Auth module
 *
 * Wraps Supabase auth. Exposes a simple API used by storage.js and auth-ui.js.
 * Falls back gracefully when Supabase is not configured.
 *
 * API:
 *   Auth.init()                     — call once on page load
 *   Auth.getUser()                  → { id, email } | null
 *   Auth.signIn(email, password)    → { error? }
 *   Auth.signUp(email, password)    → { error? }
 *   Auth.signInWithGitHub()         → redirects
 *   Auth.signOut()
 *   Auth.onChange(fn)               — fn({ user }) called on session change
 */

const Auth = (() => {
  let _client = null;
  let _user = null;
  const _listeners = [];

  function _configured() {
    const cfg = window.NICOTOLS_CONFIG;
    return cfg &&
      cfg.supabaseUrl  && cfg.supabaseUrl  !== 'YOUR_SUPABASE_URL' &&
      cfg.supabaseKey  && cfg.supabaseKey  !== 'YOUR_SUPABASE_ANON_KEY';
  }

  function _notify() {
    _listeners.forEach(fn => fn({ user: _user }));
  }

  let _initPromise = null;

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = _doInit();
    return _initPromise;
  }

  async function _doInit() {
    if (!_configured()) return;

    const { createClient } = window.supabase;
    _client = createClient(
      window.NICOTOLS_CONFIG.supabaseUrl,
      window.NICOTOLS_CONFIG.supabaseKey
    );

    const { data: { session } } = await _client.auth.getSession();
    _user = session?.user ?? null;

    _client.auth.onAuthStateChange((_event, session) => {
      _user = session?.user ?? null;
      _notify();
    });
  }

  function getUser() { return _user; }
  function getClient() { return _client; }
  function isConfigured() { return _configured(); }

  async function signIn(email, password) {
    if (!_client) return { error: { message: 'Supabase not configured' } };
    const { error } = await _client.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email, password) {
    if (!_client) return { error: { message: 'Supabase not configured' } };
    const { error } = await _client.auth.signUp({ email, password });
    return { error };
  }

  async function signInWithGitHub() {
    if (!_client) return;
    await _client.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.href },
    });
  }

  async function signOut() {
    if (!_client) return;
    await _client.auth.signOut();
  }

  function onChange(fn) {
    _listeners.push(fn);
    fn({ user: _user });
  }

  return { init, getUser, getClient, isConfigured, signIn, signUp, signInWithGitHub, signOut, onChange };
})();

window.Auth = Auth;
