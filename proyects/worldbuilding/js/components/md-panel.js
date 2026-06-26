/**
 * Edit mode  → plain textarea (raw markdown)
 * View mode  → rendered HTML only
 * onChange(val) is called on every keystroke in edit mode.
 */
function makeMdPanel(content, onChange) {
  if (!State.editMode || typeof onChange !== 'function') {
    const div = document.createElement('div');
    div.className = 'preview-only';
    div.innerHTML = renderMarkdown(content);
    bindRefLinks(div);
    return div;
  }

  const ta = UI.make('textarea').class('md-textarea').value(content);
  ta.on('input', () => onChange(ta.getElement().value));
  return ta.getElement();
}
