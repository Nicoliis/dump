/**
 * Nicotols shared UI utilities.
 * Toast notifications, data toolbar, confirm dialogs.
 *
 * Usage:
 *   UI.toast('Saved!');
 *   UI.toast('Something went wrong', 'error');
 *   UI.dataToolbar(store, { onImport: () => location.reload() });
 */

const UI = (() => {
  /* --- toasts --- */
  function ensureContainer() {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    return c;
  }

  function toast(message, type = 'info', duration = 2800) {
    const c = ensureContainer();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    c.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  /* --- data toolbar --- */
  function dataToolbar(store, { label = 'Data', onImport } = {}) {
    const bar = document.createElement('div');
    bar.className = 'data-toolbar';

    const lbl = document.createElement('span');
    lbl.textContent = label;
    bar.appendChild(lbl);

    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    bar.appendChild(spacer);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-ghost btn-sm';
    exportBtn.textContent = '⬇ Export';
    exportBtn.onclick = () => { store.exportFile(); toast('File downloaded'); };
    bar.appendChild(exportBtn);

    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-ghost btn-sm';
    importBtn.textContent = '⬆ Import';
    importBtn.onclick = async () => {
      try {
        const result = await store.importFile();
        toast(`Imported ${result.imported} entries`, 'success');
        if (onImport) onImport(result);
      } catch (e) {
        toast(e.message, 'error');
      }
    };
    bar.appendChild(importBtn);

    return bar;
  }

  /* --- confirm dialog --- */
  function confirm(message) {
    return window.confirm(message);
  }

  return { toast, dataToolbar, confirm };
})();

window.UI = UI;
