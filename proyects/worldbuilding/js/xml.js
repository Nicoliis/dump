function esc(s)   { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function cdata(s) { return '<![CDATA[' + (s||'').replace(/\]\]>/g, ']]]]><![CDATA[>') + ']]>'; }

function exportXML() {
  let x = `<?xml version="1.0" encoding="UTF-8"?>\n<storyforge>\n`;
  x += `  <home>${cdata(State.data.home.content)}</home>\n  <groups>\n`;
  for (const g of State.data.groups) {
    x += `    <group name="${esc(g.name)}" slug="${esc(g.slug)}" type="${g.type}">\n`;
    if (g.type === 'text') {
      x += `      <content>${cdata(g.content||'')}</content>\n`;
    } else {
      for (const item of g.items) {
        x += `      <item name="${esc(item.name)}">\n`;
        x += `        <refs>${(item.references||[]).map(r=>`<ref>${esc(r)}</ref>`).join('')}</refs>\n`;
        if (g.type === 'graph')
          x += `        <parents>${(item.parents||[]).map(p=>`<parent>${esc(p)}</parent>`).join('')}</parents>\n`;
        x += `        <content>${cdata(item.content)}</content>\n      </item>\n`;
      }
    }
    x += `    </group>\n`;
  }
  return x + `  </groups>\n</storyforge>`;
}

function importXML(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, 'application/xml');
  if (doc.querySelector('parsererror')) { alert('Invalid XML file'); return; }

  const homeEl = doc.querySelector('home');
  if (homeEl) State.data.home.content = homeEl.textContent;

  State.data.groups = [];
  doc.querySelectorAll('group').forEach(g => {
    const type = g.getAttribute('type');
    if (type === 'text') {
      State.data.groups.push({
        name: g.getAttribute('name'),
        slug: g.getAttribute('slug'),
        type: 'text',
        content: g.querySelector(':scope > content')?.textContent || '',
      });
      return;
    }
    const group = { name: g.getAttribute('name'), slug: g.getAttribute('slug'), type, items: [] };
    g.querySelectorAll('item').forEach(el => {
      const item = {
        id:         generateId(),
        name:       el.getAttribute('name'),
        references: [...el.querySelectorAll('refs > ref')].map(r => r.textContent),
        content:    el.querySelector('content')?.textContent || '',
      };
      if (group.type === 'graph')
        item.parents = [...el.querySelectorAll('parents > parent')].map(p => p.textContent);
      group.items.push(item);
    });
    State.data.groups.push(group);
  });
  saveData();
}
