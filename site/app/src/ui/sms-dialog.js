import { cycleForDate } from '../domain/cycles.js';
import { parseSms, prepareSmsTransactions } from '../domain/sms.js';
import { formatMoney, t } from '../i18n.js';
import { announce, el, restoreFocus, text } from './dom.js';

function rowStatus(state, row) {
  if (row.duplicateOf !== null) return 'duplicate';
  if (row.status !== 'approved') return row.status;
  const date = row.dateISO;
  if (!date) return 'recognized';
  try {
    return cycleForDate(state, date) ? 'recognized' : 'out-of-cycle';
  } catch {
    return 'out-of-cycle';
  }
}

export function openSmsDialog(options) {
  const documentLike = options.document || document;
  const state = options.state;
  const locale = options.locale || state.settings.locale;
  const opener = options.trigger || documentLike.activeElement;
  const dialog = el(documentLike, 'dialog', { className: 'app-dialog sms-dialog', attrs: { 'aria-labelledby': 'sms-title' } });
  const textarea = el(documentLike, 'textarea', { id: 'sms-input', attrs: { rows: '7', maxlength: '100000', placeholder: t(locale, 'sms.paste'), 'aria-label': t(locale, 'sms.paste') } });
  const category = el(documentLike, 'select', { id: 'sms-category', attrs: { 'aria-label': t(locale, 'transaction.category') } });
  for (const item of Object.values(state.categories || {}).filter(item => !item.isArchived)) category.append(el(documentLike, 'option', { text: item.name, attrs: { value: item.id } }));
  const wife = el(documentLike, 'input', { id: 'sms-wife', type: 'checkbox' });
  const card = el(documentLike, 'input', { id: 'sms-card', type: 'checkbox' });
  card.checked = true;
  const review = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'sms.review') });
  const importButton = el(documentLike, 'button', { className: 'button button-primary', type: 'button', text: t(locale, 'sms.import'), attrs: { 'data-sms-import': '', disabled: '' } });
  const close = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'common.close') });
  const results = el(documentLike, 'div', { className: 'sms-results', attrs: { 'aria-live': 'polite' } });
  dialog.append(
    el(documentLike, 'h2', { id: 'sms-title', text: t(locale, 'sms.title') }),
    textarea,
    category,
    el(documentLike, 'label', { className: 'check-field', attrs: { for: card.id } }, [card, t(locale, 'transaction.card')]),
    el(documentLike, 'label', { className: 'check-field', attrs: { for: wife.id } }, [wife, t(locale, 'transaction.byWife')]),
    review,
    results,
    el(documentLike, 'footer', { className: 'dialog-actions' }, [close, importButton]),
  );
  documentLike.body.append(dialog);
  let parsed = null;
  let busy = false;

  function finish() {
    if (busy) return;
    dialog.close();
    dialog.remove();
    restoreFocus(opener);
  }
  close.addEventListener('click', finish);
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });

  review.addEventListener('click', () => {
    parsed = parseSms(textarea.value);
    results.replaceChildren();
    for (const row of parsed.rows) {
      const status = rowStatus(state, row);
      let cycle = null;
      if (row.dateISO) {
        try { cycle = cycleForDate(state, row.dateISO); } catch { cycle = null; }
      }
      const article = el(documentLike, 'article', { className: 'sms-row sms-row--' + status, attrs: { 'data-sms-status': status } });
      article.append(
        el(documentLike, 'strong', { text: `${formatMoney(locale, row.amount)} — ${status}` }),
        el(documentLike, 'span', {}, text(documentLike, row.note)),
        el(documentLike, 'span', { text: `${row.dateISO || options.todayISO} · ${cycle?.id || t(locale, 'sms.outOfCycle')} · ${category.selectedOptions[0]?.text || ''}` }),
      );
      results.append(article);
    }
    for (const raw of parsed.unrecognized) results.append(el(documentLike, 'article', { className: 'sms-row sms-row--unrecognized', attrs: { 'data-sms-status': 'unrecognized' } }, text(documentLike, raw)));
    importButton.disabled = !parsed.rows.some(row => rowStatus(state, row) === 'recognized') || !category.value;
  });

  importButton.addEventListener('click', async () => {
    if (busy || !parsed) return;
    const prepared = prepareSmsTransactions(state, parsed, {
      confirm: true,
      categoryId: category.value,
      defaultDate: options.todayISO,
      byWife: wife.checked,
      isCredit: card.checked,
    });
    if (!prepared.transactions.length) return;
    busy = true;
    importButton.disabled = true;
    try {
      await options.onSubmit?.({ type: 'transaction/batchAdd', payload: { transactions: prepared.transactions }, submissionId: crypto.randomUUID() });
      const skipped = prepared.skipped.length + prepared.unrecognized.length;
      announce(documentLike, t(locale, 'sms.result', { imported: prepared.transactions.length, skipped }));
      busy = false;
      finish();
    } catch {
      busy = false;
      importButton.disabled = false;
      announce(documentLike, t(locale, 'error.unknown'), 'assertive');
    }
  });
  dialog.showModal();
  textarea.focus();
  return dialog;
}
