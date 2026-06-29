function renderMarkdown(text) {
  const processed = (text || '').replace(/#([^#\n]+)#/g, (_, inner) => {
    const colon = inner.indexOf(':');
    const display = colon >= 0 ? inner.slice(0, colon).trim() : inner.trim();
    const key     = colon >= 0 ? inner.slice(colon + 1).trim() : inner.trim();
    return `<a href="#" class="ref-link" data-ref="${slugify(key)}">${display}</a>`;
  });
  return marked.parse(processed);
}

function bindRefLinks(container) {
  container.querySelectorAll('.ref-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      navigateToRef(a.dataset.ref);
    });
  });
}

function navigateToRef(slug) {
  for (const group of (State.data?.groups || [])) {
    const idx = (group.items || []).findIndex(item => slugify(item.name) === slug);
    if (idx !== -1) { navigateToItem(group.slug, idx); return; }
  }
  alert('Item not found: ' + slug);
}
