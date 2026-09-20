import { deriveToday } from '../domain/cycles.js';
import { formatDate, formatMoney, t } from '../i18n.js';
import { el, text } from './dom.js';

function backupIsOld(lastBackupAt, todayISO) {
  if (!lastBackupAt) return false;
  const backupMs = Date.parse(lastBackupAt);
  const todayMs = Date.parse(todayISO + 'T12:00:00Z');
  return Number.isFinite(backupMs) && todayMs - backupMs > 14 * 86_400_000;
}

function recentTransactions(state) {
  return Object.values(state.transactions || {})
    .filter(Boolean)
    .sort((left, right) => (
      String(right.date).localeCompare(String(left.date))
      || String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || ''))
      || String(right.id).localeCompare(String(left.id))
    ))
    .slice(0, 5)
    .map(transaction => ({
      id: transaction.id,
      date: transaction.date,
      amount: Number(transaction.amount),
      note: String(transaction.note || ''),
      categoryId: transaction.categoryId,
      categoryName: state.categories?.[transaction.categoryId]?.name || '',
      isRefund: Boolean(transaction.isRefund),
    }));
}

export function createTodayViewModel(state, todayISO, options = {}) {
  const summary = deriveToday(state, todayISO);
  return {
    todayISO,
    locale: options.locale || state.settings?.locale || 'en',
    hasCycle: Boolean(summary.cycle),
    hero: { labelKey: 'today.safeToSpend', amount: summary.safeToSpend },
    remainingBalance: summary.remainingBalance,
    daysRemaining: summary.daysRemaining,
    pace: summary.pace,
    recent: recentTransactions(state),
    backupWarning: backupIsOld(options.lastBackupAt, todayISO),
    emptyActionRoute: summary.cycle ? null : 'plan',
  };
}

function createActivityItem(documentLike, item, locale, onEdit) {
  const button = el(documentLike, 'button', {
    className: 'activity-row',
    type: 'button',
    attrs: { 'data-transaction-id': item.id, 'aria-label': `${item.categoryName || t(locale, 'common.edit')} ${formatMoney(locale, item.amount)}` },
  });
  const main = el(documentLike, 'span', { className: 'activity-row__main' });
  main.append(
    el(documentLike, 'strong', { text: item.categoryName || t(locale, 'common.edit') }),
    el(documentLike, 'span', { className: 'activity-row__note' }, text(documentLike, item.note || formatDate(locale, item.date))),
  );
  const amount = el(documentLike, 'span', {
    className: 'activity-row__amount' + (item.isRefund ? ' is-refund' : ''),
    text: (item.isRefund ? '+' : '−') + formatMoney(locale, item.amount),
  });
  button.append(main, amount);
  button.addEventListener('click', () => onEdit?.(item.id, button));
  return button;
}

export function renderToday(container, model, actions = {}) {
  const documentLike = container.ownerDocument;
  const locale = model.locale || 'en';
  const fragment = documentLike.createDocumentFragment();
  const section = el(documentLike, 'section', {
    className: 'today-view',
    attrs: { 'data-view': 'today', 'aria-labelledby': 'today-heading' },
  });

  const hero = el(documentLike, 'header', { className: 'today-hero' });
  hero.append(
    el(documentLike, 'p', { className: 'eyebrow', text: formatDate(locale, model.todayISO) }),
    el(documentLike, 'h1', { id: 'today-heading', text: t(locale, model.hero.labelKey) }),
    el(documentLike, 'p', {
      className: 'hero-amount' + (model.hero.amount < 0 ? ' is-negative' : ''),
      attrs: { 'data-safe-to-spend': '' },
      text: formatMoney(locale, model.hero.amount),
    }),
  );
  section.append(hero);

  if (!model.hasCycle) {
    const empty = el(documentLike, 'div', { className: 'empty-state' });
    const planLink = el(documentLike, 'a', {
      className: 'button button-primary',
      text: t(locale, 'plan.title'),
      attrs: { href: '#/plan', 'data-empty-action': 'plan' },
    });
    empty.append(el(documentLike, 'p', { text: t(locale, 'plan.noCategories') }), planLink);
    section.append(empty);
    fragment.append(section);
    container.replaceChildren(fragment);
    return section;
  }

  const facts = el(documentLike, 'div', { className: 'today-facts' });
  facts.append(
    el(documentLike, 'div', { className: 'today-fact' }, [
      el(documentLike, 'span', { text: t(locale, 'today.remainingBalance') }),
      el(documentLike, 'strong', { text: formatMoney(locale, model.remainingBalance) }),
    ]),
    el(documentLike, 'div', { className: 'today-fact' }, [
      el(documentLike, 'span', { text: t(locale, 'today.daysRemaining', { count: model.daysRemaining }) }),
      el(documentLike, 'strong', { text: String(model.daysRemaining) }),
    ]),
  );
  section.append(facts);

  section.append(el(documentLike, 'p', {
    className: 'pace-line pace-line--' + model.pace.state,
    attrs: { 'data-pace-state': model.pace.state },
    text: t(locale, model.pace.detailKey),
  }));

  if (model.backupWarning) {
    const warning = el(documentLike, 'a', {
      className: 'backup-warning',
      text: t(locale, 'today.backupOld'),
      attrs: { href: '#/plan', role: 'status' },
    });
    section.append(warning);
  }

  const addButton = el(documentLike, 'button', {
    className: 'button button-primary add-transaction',
    type: 'button',
    text: t(locale, 'transaction.add'),
    attrs: { 'data-add-transaction': '' },
  });
  addButton.addEventListener('click', () => actions.onAdd?.(addButton));
  section.append(addButton);

  const activity = el(documentLike, 'section', { className: 'recent-activity', attrs: { 'aria-labelledby': 'recent-heading' } });
  activity.append(el(documentLike, 'h2', { id: 'recent-heading', text: t(locale, 'today.recentActivity') }));
  if (!model.recent.length) {
    activity.append(el(documentLike, 'p', { className: 'empty-copy', text: t(locale, 'today.noActivity') }));
  } else {
    const list = el(documentLike, 'div', { className: 'activity-list' });
    for (const item of model.recent) list.append(createActivityItem(documentLike, item, locale, actions.onEdit));
    activity.append(list);
  }
  section.append(activity);
  fragment.append(section);
  container.replaceChildren(fragment);
  return section;
}

