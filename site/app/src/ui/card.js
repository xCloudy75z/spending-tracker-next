import { bankSummary, wifeSummary } from '../domain/liabilities.js';
import { formatDate, formatMoney, t } from '../i18n.js';
import { el, text } from './dom.js';

export function createCardModel(state) {
  return {
    bank: { headingKey: 'card.bankOwed', ...bankSummary(state) },
    wife: state.settings?.wifeTracking === false ? null : { headingKey: 'card.wifeOwed', ...wifeSummary(state) },
  };
}

function ledgerRow(documentLike, locale, transaction, actionLabel, onAction, kind) {
  const row = el(documentLike, 'article', { className: 'ledger-row', attrs: { 'data-ledger-id': transaction.id, 'data-ledger-kind': kind } });
  const copy = el(documentLike, 'div', { className: 'ledger-row__copy' });
  copy.append(
    el(documentLike, 'strong', { text: formatMoney(locale, transaction.amount) }),
    el(documentLike, 'span', {}, text(documentLike, transaction.note || formatDate(locale, transaction.date))),
  );
  const action = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: actionLabel });
  action.addEventListener('click', async () => { await onAction?.(transaction.id); });
  row.append(copy, action);
  return row;
}

export function renderCard(container, state, options = {}) {
  const documentLike = container.ownerDocument;
  const locale = options.locale || state.settings?.locale || 'en';
  const model = createCardModel(state);
  const section = el(documentLike, 'section', { className: 'workspace card-view', attrs: { 'data-view': 'card' } });
  section.append(el(documentLike, 'h1', { text: t(locale, 'card.title') }));

  const bank = el(documentLike, 'section', { className: 'workspace-block liability-block bank-block', attrs: { 'aria-labelledby': 'bank-heading' } });
  bank.append(
    el(documentLike, 'h2', { id: 'bank-heading', text: t(locale, model.bank.headingKey) }),
    el(documentLike, 'p', { className: 'summary-amount', text: formatMoney(locale, model.bank.outstanding), attrs: { 'data-bank-total': '' } }),
  );
  if (!model.bank.outstandingItems.length) bank.append(el(documentLike, 'p', { className: 'empty-copy', text: t(locale, 'card.noBankBalance') }));
  for (const item of model.bank.outstandingItems) {
    bank.append(ledgerRow(documentLike, locale, item, t(locale, 'card.markPaid'), id => options.onCommand?.({ type: 'card/settle', payload: { id, settled: true } }), 'bank'));
  }
  if (model.bank.settledItems.length) {
    const history = el(documentLike, 'details', { className: 'ledger-history' });
    history.append(el(documentLike, 'summary', { text: `${t(locale, 'card.settled')} (${model.bank.settledItems.length})` }));
    for (const item of model.bank.settledItems) history.append(ledgerRow(documentLike, locale, item, t(locale, 'card.outstanding'), id => options.onCommand?.({ type: 'card/settle', payload: { id, settled: false } }), 'bank-settled'));
    bank.append(history);
  }
  section.append(bank);

  if (model.wife) {
    const wife = el(documentLike, 'section', { className: 'workspace-block liability-block wife-block', attrs: { 'aria-labelledby': 'wife-heading' } });
    wife.append(
      el(documentLike, 'h2', { id: 'wife-heading', text: t(locale, model.wife.headingKey) }),
      el(documentLike, 'p', { className: 'summary-amount', text: formatMoney(locale, model.wife.balance), attrs: { 'data-wife-total': '' } }),
    );
    if (!model.wife.unsettledPurchases.length) wife.append(el(documentLike, 'p', { className: 'empty-copy', text: t(locale, 'card.noWifeBalance') }));
    for (const item of model.wife.unsettledPurchases) {
      wife.append(ledgerRow(documentLike, locale, item, t(locale, 'card.markReimbursed'), id => options.onCommand?.({ type: 'wife/settle', payload: { id, settled: true } }), 'wife'));
    }
    if (model.wife.settledPurchases.length || model.wife.payments.length) {
      const history = el(documentLike, 'details', { className: 'ledger-history' });
      history.append(el(documentLike, 'summary', { text: `${t(locale, 'card.settled')} (${model.wife.settledPurchases.length + model.wife.payments.length})` }));
      for (const item of model.wife.settledPurchases) history.append(ledgerRow(documentLike, locale, item, t(locale, 'card.outstanding'), id => options.onCommand?.({ type: 'wife/settle', payload: { id, settled: false } }), 'wife-settled'));
      for (const payment of model.wife.payments) history.append(el(documentLike, 'p', { className: 'payment-history', text: `${formatDate(locale, payment.date)} — ${formatMoney(locale, payment.amount)}` }));
      wife.append(history);
    }
    const paymentForm = el(documentLike, 'form', { className: 'inline-form', attrs: { 'data-wife-payment': '' } });
    const amount = el(documentLike, 'input', { id: 'wife-payment-amount', type: 'number', attrs: { name: 'amount', min: '0.01', max: String(model.wife.balance), step: '0.01', inputmode: 'decimal', required: '', 'aria-label': t(locale, 'transaction.amount') } });
    const date = el(documentLike, 'input', { id: 'wife-payment-date', type: 'date', attrs: { name: 'date', value: options.todayISO, required: '', 'aria-label': t(locale, 'transaction.date') } });
    paymentForm.append(amount, date, el(documentLike, 'button', { className: 'button button-secondary', type: 'submit', text: t(locale, 'card.recordPayment') }));
    paymentForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!paymentForm.reportValidity()) return;
      const result = await options.onCommand?.({ type: 'wife/payment', payload: { amount: Number(amount.value), date: date.value, note: '' } });
      if (result !== false) {
        paymentForm.reset();
        date.value = options.todayISO;
      }
    });
    wife.append(paymentForm);
    section.append(wife);
  }

  container.replaceChildren(section);
  return section;
}
