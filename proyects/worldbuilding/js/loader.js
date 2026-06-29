/**
 * Script loader. Keeps index.html to a single <script> tag and centralises
 * cache-busting: bump VERSION here and every app file is re-fetched.
 *
 * Files are injected with async=false so they execute in listed order — the app
 * relies on globals defined by earlier files (state → cloud → data → views …).
 */
(function () {
  const VERSION = '9';

  const FILES = [
    'lib/marked.min.js',
    'lib/UI.js',
    'js/icons.js',
    'js/state.js',
    'js/cloud.js',
    'js/data.js',
    'js/seen.js',
    'js/xml.js',
    'js/markdown.js',
    'js/components/md-panel.js',
    'js/components/item-card.js',
    'js/components/ref-editor.js',
    'js/components/parent-editor.js',
    'js/components/follow.js',
    'js/sidebar.js',
    'js/views/gallery.js',
    'js/views/notifications.js',
    'js/views/profile.js',
    'js/views/world-settings.js',
    'js/views/home.js',
    'js/views/list.js',
    'js/views/dag.js',
    'js/views/graph.js',
    'js/views/text.js',
    'js/views/detail-actions.js',
    'js/views/detail.js',
    'js/views/new-group.js',
    'js/router.js',
    'js/app.js',
  ];

  FILES.forEach(src => {
    const s = document.createElement('script');
    s.src = src + '?v=' + VERSION;
    s.async = false; // preserve execution order for dynamically-inserted scripts
    document.head.appendChild(s);
  });
})();
