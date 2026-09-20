function signedAmount(transaction) {
  const amount = Number(transaction.amount) || 0;
  return transaction.isRefund ? -amount : amount;
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clone(value) {
  return structuredClone(value);
}

function liabilityError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function newestFirst(left, right) {
  return String(right.date || '').localeCompare(String(left.date || ''))
    || String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
}

export function bankSummary(state) {
  const all = Object.values(state?.transactions || {}).filter(transaction => transaction?.isCredit);
  const outstandingItems = all.filter(transaction => !transaction.liabilitySettled).sort(newestFirst);
  const settledItems = all.filter(transaction => transaction.liabilitySettled).sort(newestFirst);
  return {
    outstanding: money(outstandingItems.reduce((sum, transaction) => sum + signedAmount(transaction), 0)),
    unpaidCount: outstandingItems.length,
    outstandingItems,
    settledItems,
  };
}

export function wifeSummary(state) {
  const purchases = Object.values(state?.transactions || {}).filter(transaction => transaction?.byWife);
  const unsettledPurchases = purchases.filter(transaction => !transaction.wifeSettled).sort(newestFirst);
  const settledPurchases = purchases.filter(transaction => transaction.wifeSettled).sort(newestFirst);
  const payments = Object.values(state?.wifePayments || {}).filter(Boolean).sort(newestFirst);
  const charged = purchases.reduce((sum, transaction) => sum + signedAmount(transaction), 0);
  const settled = settledPurchases.reduce((sum, transaction) => sum + signedAmount(transaction), 0);
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return {
    charged: money(charged),
    paid: money(paid),
    balance: money(charged - settled - paid),
    unsettledPurchases,
    settledPurchases,
    payments,
  };
}

export function settleBankTransaction(state, id, settled, context = {}) {
  if (!state.transactions?.[id]?.isCredit) throw liabilityError('BANK_ITEM_NOT_FOUND', 'Card transaction not found');
  const next = clone(state);
  next.transactions[id].liabilitySettled = Boolean(settled);
  next.transactions[id].settledAt = settled ? (context.nowISO || new Date().toISOString()) : null;
  return next;
}

export function settleWifeTransaction(state, id, settled, context = {}) {
  if (!state.transactions?.[id]?.byWife) throw liabilityError('WIFE_ITEM_NOT_FOUND', 'Reimbursement transaction not found');
  const next = clone(state);
  next.transactions[id].wifeSettled = Boolean(settled);
  next.transactions[id].wifeSettledAt = settled ? (context.nowISO || new Date().toISOString()) : null;
  return next;
}

export function addWifePayment(state, draft, context = {}) {
  const next = clone(state);
  const id = draft.id || (typeof context.idFactory === 'function' ? context.idFactory('wife-payment') : 'wife-payment-' + crypto.randomUUID());
  if (next.wifePayments[id]) throw liabilityError('DUPLICATE_ID', 'Payment id already exists');
  next.wifePayments[id] = {
    id,
    amount: money(Number(draft.amount)),
    date: draft.date,
    note: String(draft.note || ''),
    createdAt: context.nowISO || new Date().toISOString(),
  };
  return next;
}
