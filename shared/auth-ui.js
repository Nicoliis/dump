/**
 * Nicotols — Auth UI
 *
 * Injects a login button into .navbar-links and renders a modal for
 * sign-in / sign-up. Works with any page that includes the shared navbar.
 *
 * Call once after the DOM is ready:
 *   AuthUI.init();
 */

const AuthUI = (() => {
  let _modal = null;
  let _mode = 'signin'; // 'signin' | 'signup'

  /* ── Modal HTML ── */
  function _buildModal() {
    const el = document.createElement('div');
    el.id = 'auth-modal-overlay';
    el.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div class="auth-modal-header">
          <h2 id="auth-modal-title">Sign in</h2>
          <button class="auth-modal-close btn btn-ghost btn-sm" aria-label="Close">✕</button>
        </div>

        <div id="auth-error" class="auth-error hidden"></div>
        <div id="auth-info"  class="auth-info  hidden"></div>

        <form id="auth-form" novalidate>
          <div class="mb-md">
            <label for="auth-email">Email</label>
            <input id="auth-email" type="email" autocomplete="email" placeholder="you@example.com" required />
          </div>
          <div class="mb-md">
            <label for="auth-password">Password</label>
            <input id="auth-password" type="password" autocomplete="current-password" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%" id="auth-submit">Sign in</button>
        </form>

        <div class="auth-divider"><span>or</span></div>

        <button class="btn btn-ghost" style="width:100%" id="auth-github-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Continue with GitHub
        </button>

        <p class="auth-toggle text-center text-sm mt-md">
          <span id="auth-toggle-text">Don't have an account?</span>
          <a href="#" id="auth-toggle-link">Sign up</a>
        </p>
      </div>
    `;
    return el;
  }

  /* ── Navbar button ── */
  function _buildNavBtn() {
    const btn = document.createElement('button');
    btn.id = 'auth-nav-btn';
    btn.className = 'btn btn-ghost btn-sm';
    btn.textContent = 'Sign in';
    return btn;
  }

  function _buildUserChip(user) {
    const chip = document.createElement('div');
    chip.id = 'auth-nav-btn';
    chip.className = 'auth-user-chip';
    chip.innerHTML = `
      <span class="auth-avatar">${user.email[0].toUpperCase()}</span>
      <span class="text-sm">${user.email}</span>
      <button class="btn btn-ghost btn-sm" id="auth-signout-btn">Sign out</button>
    `;
    return chip;
  }

  /* ── Open / close modal ── */
  function open(mode = 'signin') {
    _mode = mode;
    _modal.querySelector('#auth-modal-title').textContent = mode === 'signin' ? 'Sign in' : 'Sign up';
    _modal.querySelector('#auth-submit').textContent      = mode === 'signin' ? 'Sign in' : 'Sign up';
    _modal.querySelector('#auth-toggle-text').textContent = mode === 'signin' ? "Don't have an account?" : 'Already have one?';
    _modal.querySelector('#auth-toggle-link').textContent = mode === 'signin' ? 'Sign up' : 'Sign in';
    _modal.querySelector('#auth-password').autocomplete  = mode === 'signin' ? 'current-password' : 'new-password';
    _clearMessages();
    _modal.classList.remove('hidden');
    _modal.querySelector('#auth-email').focus();
  }

  function close() { _modal.classList.add('hidden'); }

  function _clearMessages() {
    ['auth-error', 'auth-info'].forEach(id => {
      const el = _modal.querySelector('#' + id);
      el.textContent = '';
      el.classList.add('hidden');
    });
  }

  function _showError(msg) {
    const el = _modal.querySelector('#auth-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function _showInfo(msg) {
    const el = _modal.querySelector('#auth-info');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  /* ── Update navbar based on auth state ── */
  function _updateNav(user) {
    const links = document.querySelector('.navbar-links');
    if (!links) return;
    const existing = document.getElementById('auth-nav-btn');
    if (existing) existing.remove();

    if (user) {
      const chip = _buildUserChip(user);
      links.appendChild(chip);
      chip.querySelector('#auth-signout-btn').onclick = () => Auth.signOut();
    } else {
      const btn = _buildNavBtn();
      btn.onclick = () => open('signin');
      links.appendChild(btn);
    }
  }

  /* ── Init ── */
  async function init() {
    // Build and insert modal
    _modal = _buildModal();
    _modal.classList.add('hidden');
    document.body.appendChild(_modal);

    // Wire close
    _modal.querySelector('.auth-modal-close').onclick = close;
    _modal.addEventListener('click', e => { if (e.target === _modal) close(); });

    // Wire toggle
    _modal.querySelector('#auth-toggle-link').addEventListener('click', e => {
      e.preventDefault();
      open(_mode === 'signin' ? 'signup' : 'signin');
    });

    // Wire GitHub
    _modal.querySelector('#auth-github-btn').onclick = () => Auth.signInWithGitHub();

    // Wire form
    _modal.querySelector('#auth-form').addEventListener('submit', async e => {
      e.preventDefault();
      _clearMessages();
      const email    = _modal.querySelector('#auth-email').value.trim();
      const password = _modal.querySelector('#auth-password').value;
      const btn      = _modal.querySelector('#auth-submit');
      btn.disabled   = true;
      btn.textContent = _mode === 'signin' ? 'Signing in…' : 'Signing up…';

      const fn = _mode === 'signin' ? Auth.signIn : Auth.signUp;
      const { error } = await fn(email, password);

      btn.disabled = false;
      btn.textContent = _mode === 'signin' ? 'Sign in' : 'Sign up';

      if (error) {
        _showError(error.message);
      } else if (_mode === 'signup') {
        _showInfo('Check your email to confirm your account, then sign in.');
      } else {
        close();
      }
    });

    // Init auth + react to state changes
    await Auth.init();
    Auth.onChange(({ user }) => _updateNav(user));

    // If not configured, hide auth entirely
    if (!Auth.isConfigured()) {
      console.info('Nicotols: Supabase not configured — running in local-only mode.');
    }
  }

  return { init, open, close };
})();

window.AuthUI = AuthUI;
