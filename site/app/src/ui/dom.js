let sequence = 0;

export function el(documentLike, tagName, options = {}, children = []) {
  const node = documentLike.createElement(tagName);
  if (options.id) node.id = options.id;
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.type) node.type = options.type;
  for (const [name, value] of Object.entries(options.attrs || {})) {
    if (value !== null && value !== undefined) node.setAttribute(name, String(value));
  }
  for (const [name, value] of Object.entries(options.dataset || {})) {
    node.dataset[name] = String(value);
  }
  const childList = Array.isArray(children) ? children : [children];
  for (const child of childList) {
    if (child === null || child === undefined) continue;
    node.append(child instanceof documentLike.defaultView.Node ? child : documentLike.createTextNode(String(child)));
  }
  return node;
}

export function text(documentLike, value) {
  const node = documentLike.createElement('bdi');
  node.dir = 'auto';
  node.textContent = String(value ?? '');
  return node;
}

export function restoreFocus(target) {
  if (target && target.isConnected && typeof target.focus === 'function') target.focus();
}

export function createDialog(documentLike, options = {}) {
  const id = 'dialog-' + (++sequence);
  const dialog = el(documentLike, 'dialog', {
    className: 'app-dialog',
    attrs: {
      'aria-labelledby': id + '-title',
      'aria-describedby': id + '-description',
    },
  });
  const title = el(documentLike, 'h2', { id: id + '-title', text: options.title || '' });
  const description = el(documentLike, 'p', {
    id: id + '-description',
    className: 'dialog-description',
    text: options.description || '',
  });
  const body = el(documentLike, 'div', { className: 'dialog-body' }, options.content || []);
  const dismiss = el(documentLike, 'button', {
    className: 'button button-secondary',
    text: options.closeLabel || 'Close',
    type: 'button',
  });
  const footer = el(documentLike, 'footer', { className: 'dialog-actions' }, dismiss);
  dialog.append(title, description, body, footer);
  documentLike.body.append(dialog);

  let opener = null;
  let busy = false;
  dismiss.addEventListener('click', () => {
    if (!busy) dialog.close();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (!busy) dialog.close();
  });
  dialog.addEventListener('close', () => {
    const target = opener;
    opener = null;
    restoreFocus(target);
    options.onClose?.(dialog.returnValue);
  });

  return {
    element: dialog,
    open(trigger = documentLike.activeElement) {
      opener = trigger;
      if (!dialog.open) dialog.showModal();
      const first = dialog.querySelector('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
      first?.focus();
    },
    close(value = '') {
      if (dialog.open && !busy) dialog.close(value);
    },
    setBusy(value) {
      busy = Boolean(value);
      dialog.setAttribute('aria-busy', String(busy));
      dialog.dataset.busy = String(busy);
    },
    isBusy() {
      return busy;
    },
  };
}

export function announce(documentLike, message, priority = 'polite') {
  let region = documentLike.querySelector('[data-live-region]');
  if (!region) {
    region = el(documentLike, 'div', {
      className: 'visually-hidden',
      attrs: { 'data-live-region': '', 'aria-atomic': 'true' },
    });
    documentLike.body.append(region);
  }
  const normalized = priority === 'assertive' ? 'assertive' : 'polite';
  region.setAttribute('aria-live', normalized);
  region.setAttribute('role', normalized === 'assertive' ? 'alert' : 'status');
  region.textContent = String(message);
  return region;
}
