# Storage guide — adding a new tool to Nicotols

This doc covers everything you need to plug a new HTML/JS tool into the shared storage stack.

---

## How storage works

| Situation | Behaviour |
|-----------|-----------|
| Not logged in | Data lives in `localStorage` only. Export/Import JSON still works. |
| Logged in | `localStorage` is the fast read cache. Every write is also sent to Supabase. On first login the cloud data is pulled down automatically. |

The `Storage(namespace)` API is the same in both modes — you never write different code for each case.

---

## One-time Supabase setup (do this once for the whole project)

### 1. Create a free Supabase project

Go to [supabase.com](https://supabase.com) → New project. Free tier gives 500 MB and unlimited auth.

### 2. Run this SQL in the Supabase SQL editor

```sql
create table if not exists tool_data (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  tool       text        not null,
  key        text        not null,
  value      jsonb,
  updated_at timestamptz default now(),
  unique (user_id, tool, key)
);

alter table tool_data enable row level security;

create policy "users own their data"
  on tool_data for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 3. Fill in `shared/config.js`

Go to **Project Settings → API** in Supabase and copy the two values:

```js
const NICOTOLS_CONFIG = {
  supabaseUrl: 'https://xxxxxxxxxxxx.supabase.co',
  supabaseKey: 'eyJhbGciOiJ...',   // "anon public" key
};
```

### 4. (Optional) Enable GitHub OAuth

In Supabase → **Authentication → Providers → GitHub**: paste your GitHub OAuth app's Client ID and Secret.
Create the OAuth app at GitHub → Settings → Developer settings → OAuth Apps.
Set the callback URL to: `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`

---

## Adding a new tool

### 1. Create the folder

```
proyects/
└── mytool/
    ├── index.html
    ├── js/
    └── css/
```

### 2. Add the shared scripts to `index.html`

Paste this into `<head>` — order matters:

```html
<link rel="stylesheet" href="../../shared/style.css" />
<!-- your tool's own CSS after the shared one -->

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../../shared/config.js"></script>
<script src="../../shared/storage.js"></script>
<script src="../../shared/auth.js"></script>
<script src="../../shared/auth-ui.js"></script>
<script src="../../shared/ui.js"></script>
```

Add a shared navbar (copy from another tool) and initialise auth at the bottom of `<body>`:

```html
<nav class="navbar">
  <div class="container">
    <a class="navbar-brand" href="../../index.html">Nico<span>tools</span></a>
    <div class="navbar-links">
      <a href="../../index.html">← Hub</a>
      <!-- AuthUI.init() inserts the login button here -->
    </div>
  </div>
</nav>

<!-- ... your tool content ... -->

<script>
  document.addEventListener('DOMContentLoaded', () => AuthUI.init());
</script>
```

### 3. Use the Storage API

Pick a short namespace unique to your tool (e.g. `'mytool'`):

```js
const store = Storage('mytool');

// Read (sync, returns from localStorage immediately)
const items = store.get('items', []);

// Write (localStorage + Supabase when logged in)
await store.set('items', items);

// Remove one key
store.remove('items');

// Export everything as a JSON file download
store.exportFile();

// Import from a JSON file (opens file picker)
await store.importFile();
```

### 4. (Optional) Add the data toolbar

The shared `UI.dataToolbar()` renders Export / Import buttons + a toast notification area.

```js
// After DOM is ready, insert the toolbar wherever you like
const store = Storage('mytool');
const toolbar = UI.dataToolbar(store, {
  label: 'My Tool data',
  onImport: () => location.reload(), // refresh UI after import
});
document.getElementById('toolbar-container').appendChild(toolbar);
```

### 5. Sync on login

If your tool needs to react when the user logs in (e.g. re-render the list with cloud data),
listen for auth changes:

```js
Auth.onChange(async ({ user }) => {
  if (user) {
    await store.sync();   // pull from Supabase into localStorage
    renderMyTool();       // re-render with the fresh data
  }
});
```

---

## Full minimal template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Tool — Nicotols</title>
  <link rel="stylesheet" href="../../shared/style.css" />
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="../../shared/config.js"></script>
  <script src="../../shared/storage.js"></script>
  <script src="../../shared/auth.js"></script>
  <script src="../../shared/auth-ui.js"></script>
  <script src="../../shared/ui.js"></script>
</head>
<body>

  <nav class="navbar">
    <div class="container">
      <a class="navbar-brand" href="../../index.html">Nico<span>tools</span></a>
      <div class="navbar-links">
        <a href="../../index.html">← Hub</a>
      </div>
    </div>
  </nav>

  <main class="container">
    <div class="page-header">
      <h1>My Tool</h1>
    </div>

    <div id="toolbar-container"></div>

    <!-- tool content here -->
  </main>

  <script>
    const store = Storage('mytool');

    document.addEventListener('DOMContentLoaded', async () => {
      await AuthUI.init();

      // Insert export/import toolbar
      document.getElementById('toolbar-container').appendChild(
        UI.dataToolbar(store, { label: 'My Tool', onImport: () => location.reload() })
      );

      // Re-render when user logs in
      Auth.onChange(async ({ user }) => {
        if (user) {
          await store.sync();
          render();
        }
      });

      render();
    });

    function render() {
      const items = store.get('items', []);
      // ... build your UI
    }
  </script>
</body>
</html>
```

---

## Storage API reference

| Method | Returns | Description |
|--------|---------|-------------|
| `store.get(key, fallback)` | value | Read from localStorage (sync) |
| `await store.set(key, value)` | — | Write to localStorage + Supabase |
| `store.remove(key)` | — | Delete from localStorage + Supabase |
| `store.clear()` | — | Wipe all keys for this namespace (local only) |
| `store.dump()` | `{ key: value }` | All entries for this namespace from localStorage |
| `await store.sync()` | `{ synced: n }` | Pull all cloud entries into localStorage |
| `store.exportFile()` | — | Download all data as a JSON file |
| `await store.importFile()` | `{ imported: n }` | Open file picker and load a JSON file |

## Auth API reference

| Method | Returns | Description |
|--------|---------|-------------|
| `Auth.getUser()` | `{ id, email }` \| `null` | Current logged-in user |
| `Auth.isConfigured()` | `boolean` | Whether Supabase config is filled in |
| `Auth.signIn(email, pw)` | `{ error? }` | Sign in with email + password |
| `Auth.signUp(email, pw)` | `{ error? }` | Create account |
| `Auth.signInWithGitHub()` | — | OAuth redirect |
| `Auth.signOut()` | — | Sign out |
| `Auth.onChange(fn)` | — | Subscribe to auth state changes |
| `AuthUI.init()` | — | Mount login button + modal into the navbar |
| `AuthUI.open('signin')` | — | Open the modal programmatically |
