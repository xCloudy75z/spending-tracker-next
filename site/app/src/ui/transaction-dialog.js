import { cycleForDate } from '../domain/cycles.js';
import { isValidISODate } from '../domain/dates.js';
import { t } from '../i18n.js';
import { announce, el, restoreFocus } from './dom.js';

function field(documentLike, labelText, control) {
  const label = el(documentLike, 'label', { className: 'form-field', attrs: { for: control.id } });
  label.append(el(documentLike, 'span', { className: 'form-label', text: labelText }), control);
  return label;
}

function activeCategories(state) {
  return Object.values(state.categories || {})
    .filter(category => category && !category.isArchived)
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
}

function isAmountValid(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0.01 && amount <= 999_999_999.99;
}

function transactionDraft(form, current) {
  const data = new FormData(form);
  const isCredit = data.has('isCredit');
  return {
    amount: Number(data.get('amount')),
    categoryId: String(data.get('categoryId') || ''),
    date: String(data.get('date') || ''),
    note: String(data.get('note') || '').slice(0, 500),
    kind: String(data.get('kind') || 'expense'),
    isCredit,
    creditSource: isCredit ? 'explicit' : null,
    liabilitySettled: current?.liabilitySettled || false,
    byWife: data.has('byWife'),
    wifeSettled: current?.wifeSettled || false,
    isExcludedFromPace: current?.isExcludedFromPace || false,
    exclusionSource: current?.exclusionSource || null,
  };
}

export function openTransactionDialog(options) {
  const documentLike = options.document || document;
  const state = options.state;
  const locale = options.locale || state.settings?.locale || 'en';
  const current = options.transaction || null;
  const opener = options.trigger || documentLike.activeElement;
  const categories = activeCategories(state);
  const submissionId = globalThis.crypto?.randomUUID?.() || `submission-${Date.now()}-${Math.random()}`;

  const dialog = el(documentLike, 'dialog', {
    className: 'app-dialog transaction-dialog',
    attrs: { 'aria-labelledby': 'transaction-dialog-title' },
  });
  const title = el(documentLike, 'h2', {
    id: 'transaction-dialog-title',
    text: t(locale, current ? 'transaction.edit' : 'transaction.add'),
  });
  const form = el(documentLike, 'form', { className: 'transaction-form', attrs: { novalidate: '' } });

  const amount = el(documentLike, 'input', {
    id: 'transaction-amount',
    type: 'number',
    attrs: {
      name: 'amount', inputmode: 'decimal', min: '0.01', max: '999999999.99', step: '0.01', required: '',
      autocomplete: 'off', value: current?.amount ?? '',
    },
  });

  const kind = el(documentLike, 'fieldset', { className: 'choice-field' });
  kind.append(el(documentLike, 'legend', { text: t(locale, 'transaction.type') }));
  for (const [value, key] of [['expense', 'transaction.expense'], ['income', 'transaction.income'], ['refund', 'transaction.refund']]) {
    const input = el(documentLike, 'input', {
      id: 'transaction-kind-' + value,
      type: 'radio',
      attrs: { name: 'kind', value },
    });
    const currentKind = current?.kind || (current?.isRefund ? 'refund' : 'expense');
    if (value === currentKind) input.checked = true;
    const label = el(documentLike, 'label', { attrs: { for: input.id } }, [input, t(locale, key)]);
    kind.append(label);
  }

  const category = el(documentLike, 'select', {
    id: 'transaction-category',
    attrs: { name: 'categoryId', required: '' },
  });
  category.append(el(documentLike, 'option', { text: '—', attrs: { value: '' } }));
  const preferredCategory = current?.categoryId || state.settings?.lastUsedCategoryId;
  for (const item of categories) {
    const option = el(documentLike, 'option', { text: item.name, attrs: { value: item.id } });
    if (item.id === preferredCategory) option.selected = true;
    category.append(option);
  }

  const details = el(documentLike, 'details', { className: 'transaction-details' });
  const summary = el(documentLike, 'summary', { id: 'transaction-more', text: t(locale, 'common.more') });
  const date = el(documentLike, 'input', {
    id: 'transaction-date', type: 'date',
    attrs: { name: 'date', required: '', value: current?.date || options.todayISO },
  });
  const note = el(documentLike, 'textarea', {
    id: 'transaction-note',
    attrs: { name: 'note', maxlength: '500', rows: '3' },
  });
  note.value = current?.note || '';
  const card = el(documentLike, 'input', { id: 'transaction-card', type: 'checkbox', attrs: { name: 'isCredit' } });
  card.checked = Boolean(current?.isCredit);
  const wife = el(documentLike, 'input', { id: 'transaction-wife', type: 'checkbox', attrs: { name: 'byWife' } });
  wife.checked = Boolean(current?.byWife);
  const cardLabel = el(documentLike, 'label', { className: 'check-field', attrs: { for: card.id } }, [card, t(locale, 'transaction.card')]);
  const detailChildren = [
    field(documentLike, t(locale, 'transaction.date'), date),
    field(documentLike, t(locale, 'transaction.note'), note),
    cardLabel,
  ];
  if (state.settings?.wifeTracking) {
    detailChildren.push(el(documentLike, 'label', { className: 'check-field', attrs: { for: wife.id } }, [wife, t(locale, 'transaction.byWife')]));
  }
  details.append(summary, ...detailChildren);

  const error = el(documentLike, 'div', {
    className: 'form-error',
    attrs: { role: 'alert', 'aria-live': 'polite', 'data-outside-cycle': '', hidden: '' },
  });
  const cancel = el(documentLike, 'button', {
    className: 'button button-secondary', type: 'button', text: t(locale, 'common.cancel'),
  });
  const save = el(documentLike, 'button', {
    className: 'button button-primary', type: 'submit', text: t(locale, 'common.save'),
    attrs: { 'data-transaction-save': '', disabled: '' },
  });
  const actions = el(documentLike, 'footer', { className: 'dialog-actions' }, [cancel, save]);
  form.append(field(documentLike, t(locale, 'transaction.amount'), amount), kind, field(documentLike, t(locale, 'transaction.category'), category), details, error, actions);
  dialog.append(title, form);
  documentLike.body.append(dialog);

  let finished = false;
  let submitting = false;
  let resolveResult;
  const result = new Promise(resolve => { resolveResult = resolve; });

  function close(value) {
    if (finished) return;
    finished = true;
    if (dialog.open) dialog.close();
    dialog.remove();
    restoreFocus(opener);
    resolveResult(value);
  }

  function validate() {
    const amountOkay = isAmountValid(amount.value);
    const categoryOkay = Boolean(category.value && state.categories?.[category.value] && !state.categories[category.value].isArchived);
    let dateOkay = isValidISODate(date.value);
    let cycle = null;
    if (dateOkay) {
      try {
        cycle = cycleForDate(state, date.value);
      } catch {
        cycle = null;
      }
      dateOkay = Boolean(cycle);
    }
    error.replaceChildren();
    if (isValidISODate(date.value) && !cycle) {
      error.hidden = false;
      error.append(
        el(documentLike, 'span', { text: t(locale, 'error.outsideCycle') }),
        ' ',
        el(documentLike, 'a', { text: t(locale, 'plan.title'), attrs: { href: '#/plan' } }),
      );
    } else {
      error.hidden = true;
    }
    save.disabled = submitting || !(amountOkay && categoryOkay && dateOkay && note.value.length <= 500);
    return !save.disabled;
  }

  form.addEventListener('input', validate);
  form.addEventListener('change', validate);
  cancel.addEventListener('click', () => close(null));
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (!submitting) close(null);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !validate()) return;
    submitting = true;
    save.disabled = true;
    dialog.setAttribute('aria-busy', 'true');
    const draft = transactionDraft(form, current);
    const command = current
      ? { type: 'transaction/update', payload: { id: current.id, patch: draft }, submissionId }
      : { type: 'transaction/add', payload: draft, submissionId };
    try {
      await options.onSubmit?.(command);
      announce(documentLike, t(locale, 'transaction.saved'));
      close(command);
    } catch (submitError) {
      submitting = false;
      dialog.setAttribute('aria-busy', 'false');
      error.hidden = false;
      error.textContent = submitError?.code === 'DATE_OUTSIDE_CYCLES'
        ? t(locale, 'error.outsideCycle')
        : t(locale, 'error.unknown');
      validate();
    }
  });

  validate();
  dialog.showModal();
  amount.focus();
  result.element = dialog;
  return result;
}
