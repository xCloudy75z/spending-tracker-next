import { formatDate, formatMoney, t } from '../i18n.js';
import { cycleForDate } from '../domain/cycles.js';
import { el, restoreFocus, text } from './dom.js';

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .trim();
}

function signedAmount(transaction) {
  return (transaction.isRefund ? -1 : 1) * Number(transaction.amount || 0);
}

function matchesType(transaction, type) {
  if (!type || type === 'all') return true;
  const kind = transaction.kind || (transaction.isRefund ? 'refund' : 'expense');
  if (type === 'expenses') return kind === 'expense';
  if (type === 'income') return kind === 'income';
  if (type === 'refunds') return kind === 'refund';
  if (type === 'card') return transaction.isCredit;
  if (type === 'wife') return transaction.byWife;
  return true;
}

function transactionItem(state, transaction) {
  return {
    ...transaction,
    categoryName: state.categories?.[transaction.categoryId]?.name || transaction.categoryId,
  };
}

export function createActivityModel(state, filters = {}, todayISO = null) {
  const search = normalizeSearch(filters.search);
  const items = Object.values(state.transactions || {})
    .filter(Boolean)
    .filter(transaction => !filters.categoryId || transaction.categoryId === filters.categoryId)
    .filter(transaction => !filters.cycleId || transaction.cycleId === filters.cycleId)
    .filter(transaction => matchesType(transaction, filters.type))
    .map(transaction => transactionItem(state, transaction))
    .filter(transaction => {
      if (!search) return true;
      return normalizeSearch([transaction.note, transaction.categoryName, transaction.date].join(' ')).includes(search);
    })
    .sort((left, right) => String(right.date).localeCompare(String(left.date)) || String(right.id).localeCompare(String(left.id)));

  let activeCycleId = state.settings?.activeCycleId;
  if (todayISO) {
    try { activeCycleId = cycleForDate(state, todayISO)?.id || null; } catch { activeCycleId = null; }
  }
  const activeTransactions = Object.values(state.transactions || {}).filter(item => item?.cycleId === activeCycleId);
  const history = Object.values(state.cycles || {})
    .filter(cycle => cycle && cycle.id !== activeCycleId && (!todayISO || cycle.endDate < todayISO))
    .sort((left, right) => String(right.startDate).localeCompare(String(left.startDate)))
    .map(cycle => ({
      ...cycle,
      spent: Math.round(Object.values(state.transactions || {})
        .filter(item => item?.cycleId === cycle.id)
        .reduce((sum, item) => sum + signedAmount(item), 0) * 100) / 100,
    }));

  return {
    filters: { search: filters.search || '', type: filters.type || 'all', categoryId: filters.categoryId || '', cycleId: filters.cycleId || '' },
    items,
    resultCount: items.length,
    hasActiveFilters: Boolean(search || filters.categoryId || filters.cycleId || (filters.type && filters.type !== 'all')),
    currentCycleTotal: Math.round(activeTransactions.reduce((sum, item) => sum + signedAmount(item), 0) * 100) / 100,
    history,
    categories: Object.values(state.categories || {}).filter(Boolean).sort((a, b) => a.order - b.order),
    cycles: Object.values(state.cycles || {}).filter(Boolean).sort((a, b) => String(b.startDate).localeCompare(String(a.startDate))),
  };
}

function option(documentLike, value, label, selected) {
  const node = el(documentLike, 'option', { text: label, attrs: { value } });
  node.selected = value === selected;
  return node;
}

export function confirmTransactionDelete(documentLike, locale, transaction, trigger) {
  const dialog = el(documentLike, 'dialog', { className: 'app-dialog confirm-dialog', attrs: { 'aria-labelledby': 'delete-title' } });
  const cancel = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'common.cancel') });
  const confirm = el(documentLike, 'button', { className: 'button button-danger', type: 'button', text: t(locale, 'common.delete') });
  dialog.append(
    el(documentLike, 'h2', { id: 'delete-title', text: t(locale, 'transaction.deleteConfirm') }),
    el(documentLike, 'p', {}, text(documentLike, transaction.note || formatMoney(locale, transaction.amount))),
    el(documentLike, 'footer', { className: 'dialog-actions' }, [cancel, confirm]),
  );
  documentLike.body.append(dialog);
  return new Promise(resolve => {
    const finish = value => {
      dialog.close();
      dialog.remove();
      restoreFocus(trigger);
      resolve(value);
    };
    cancel.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
    dialog.showModal();
    cancel.focus();
  });
}

export function renderActivity(container, state, options = {}) {
  const documentLike = container.ownerDocument;
  const locale = options.locale || state.settings?.locale || 'en';
  const filters = { ...(options.filters || {}) };
  const model = createActivityModel(state, filters, options.todayISO);
  const section = el(documentLike, 'section', { className: 'workspace activity-view', attrs: { 'data-view': 'activity' } });
  section.append(el(documentLike, 'h1', { text: t(locale, 'activity.title') }));

  const filterBox = el(documentLike, 'div', { className: 'filter-bar', attrs: { 'aria-label': t(locale, 'common.filter') } });
  const search = el(documentLike, 'input', { type: 'search', attrs: { value: model.filters.search, placeholder: t(locale, 'common.search'), 'aria-label': t(locale, 'common.search') } });
  const type = el(documentLike, 'select', { attrs: { 'aria-label': t(locale, 'transaction.type') } });
  type.append(
    option(documentLike, 'all', t(locale, 'activity.all'), model.filters.type),
    option(documentLike, 'expenses', t(locale, 'activity.expenses'), model.filters.type),
    option(documentLike, 'income', t(locale, 'activity.income'), model.filters.type),
    option(documentLike, 'refunds', t(locale, 'activity.refunds'), model.filters.type),
    option(documentLike, 'card', t(locale, 'activity.card'), model.filters.type),
    option(documentLike, 'wife', t(locale, 'activity.wife'), model.filters.type),
  );
  const category = el(documentLike, 'select', { attrs: { 'aria-label': t(locale, 'transaction.category') } });
  category.append(option(documentLike, '', t(locale, 'activity.all'), model.filters.categoryId));
  for (const item of model.categories) category.append(option(documentLike, item.id, item.name, model.filters.categoryId));
  const cycle = el(documentLike, 'select', { attrs: { 'aria-label': t(locale, 'plan.cycleDates') } });
  cycle.append(option(documentLike, '', t(locale, 'activity.all'), model.filters.cycleId));
  for (const item of model.cycles) cycle.append(option(documentLike, item.id, `${item.startDate} — ${item.endDate}`, model.filters.cycleId));
  const apply = () => options.onFilters?.({ search: search.value, type: type.value, categoryId: category.value, cycleId: cycle.value });
  let searchTimer = null;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(apply, 150);
  });
  type.addEventListener('change', apply);
  category.addEventListener('change', apply);
  cycle.addEventListener('change', apply);
  filterBox.append(search, type, category, cycle);
  if (model.hasActiveFilters) {
    const clear = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'activity.clearFilters'), attrs: { 'data-clear-filters': '' } });
    clear.addEventListener('click', () => options.onFilters?.({}));
    filterBox.append(clear);
  }
  section.append(filterBox, el(documentLike, 'p', { className: 'result-count', text: String(model.resultCount), attrs: { 'aria-live': 'polite', 'data-result-count': '' } }));

  if (!model.items.length) {
    section.append(el(documentLike, 'p', { className: 'empty-copy', text: t(locale, 'activity.noResults') }));
  } else {
    const list = el(documentLike, 'div', { className: 'transaction-list' });
    let currentDate = null;
    for (const item of model.items) {
      if (item.date !== currentDate) {
        currentDate = item.date;
        list.append(el(documentLike, 'h2', { className: 'date-heading', text: formatDate(locale, item.date) }));
      }
      const row = el(documentLike, 'article', { className: 'transaction-row', attrs: { 'data-activity-id': item.id } });
      const copy = el(documentLike, 'div', { className: 'transaction-row__copy' });
      const kind = item.kind || (item.isRefund ? 'refund' : 'expense');
      const detail = [
        t(locale, `transaction.${kind}`),
        item.isCredit ? t(locale, 'transaction.card') : t(locale, 'transaction.cash'),
        item.byWife ? t(locale, 'activity.wife') : null,
        item.source === 'sms' ? t(locale, 'activity.sourceSms') : t(locale, 'activity.sourceManual'),
      ].filter(Boolean).join(' · ');
      copy.append(
        el(documentLike, 'strong', { text: item.categoryName }),
        el(documentLike, 'span', {}, text(documentLike, item.note || item.date)),
        el(documentLike, 'small', { text: detail }),
      );
      const edit = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'common.edit') });
      const remove = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'common.delete') });
      edit.addEventListener('click', () => options.onEdit?.(item.id, edit));
      remove.addEventListener('click', () => options.onDelete?.(item.id, remove));
      row.append(copy, el(documentLike, 'strong', { className: 'transaction-row__amount', text: (item.isRefund ? '+' : '−') + formatMoney(locale, item.amount) }), el(documentLike, 'div', { className: 'row-actions' }, [edit, remove]));
      list.append(row);
    }
    section.append(list);
  }

  if (model.history.length) {
    const history = el(documentLike, 'section', { className: 'cycle-history', attrs: { 'aria-labelledby': 'history-title' } });
    history.append(el(documentLike, 'h2', { id: 'history-title', text: t(locale, 'activity.cycleHistory') }));
    for (const item of model.history) history.append(el(documentLike, 'p', { text: `${formatDate(locale, item.startDate)} — ${formatMoney(locale, item.spent)}` }));
    section.append(history);
  }
  container.replaceChildren(section);
  return section;
}
