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
  const openPurchases = purchases.filter(transaction => !transaction.wifeSettled);
  const settledPurchases = purchases.filter(transaction => transaction.wifeSettled).sort(newestFirst);
  const payments = Object.values(state?.wifePayments || {}).filter(Boolean).sort(newestFirst);
  let unallocatedPayments = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const allocatedPurchases = [...openPurchases]
    .sort((left, right) => newestFirst(right, left))
    .map(transaction => {
      const value = Math.max(0, signedAmount(transaction));
      const paymentAllocated = Math.min(value, unallocatedPayments);
      unallocatedPayments = money(unallocatedPayments - paymentAllocated);
      const outstandingAmount = money(value - paymentAllocated);
      return {
        ...transaction,
        paymentAllocated: money(paymentAllocated),
        outstandingAmount,
        settlementDisabled: paymentAllocated > 0,
      };
    });
  const unsettledPurchases = allocatedPurchases.filter(transaction => transaction.outstandingAmount > 0).sort(newestFirst);
  const paymentCoveredPurchases = allocatedPurchases.filter(transaction => transaction.outstandingAmount === 0).sort(newestFirst);
  const charged = purchases.reduce((sum, transaction) => sum + signedAmount(transaction), 0);
  const settled = settledPurchases.reduce((sum, transaction) => sum + signedAmount(transaction), 0);
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return {
    charged: money(charged),
    paid: money(paid),
    balance: Math.max(0, money(charged - settled - paid)),
    unsettledPurchases,
    paymentCoveredPurchases,
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
  if (settled && !next.transactions[id].wifeSettled) {
    const available = wifeSummary(next).balance;
    const value = signedAmount(next.transactions[id]);
    if (value > available) throw liabilityError('WIFE_SETTLEMENT_EXCEEDS_BALANCE', 'Settlement exceeds the outstanding reimbursement balance');
  }
  next.transactions[id].wifeSettled = Boolean(settled);
  next.transactions[id].wifeSettledAt = settled ? (context.nowISO || new Date().toISOString()) : null;
  return next;
}

export function addWifePayment(state, draft, context = {}) {
  const amount = money(Number(draft.amount));
  if (!Number.isFinite(amount) || amount <= 0) throw liabilityError('WIFE_PAYMENT_INVALID', 'Payment must be a positive amount');
  if (amount > wifeSummary(state).balance) throw liabilityError('WIFE_PAYMENT_EXCEEDS_BALANCE', 'Payment exceeds the outstanding reimbursement balance');
  const next = clone(state);
  const id = draft.id || (typeof context.idFactory === 'function' ? context.idFactory('wife-payment') : 'wife-payment-' + crypto.randomUUID());
  if (next.wifePayments[id]) throw liabilityError('DUPLICATE_ID', 'Payment id already exists');
  next.wifePayments[id] = {
    id,
    amount,
    date: draft.date,
    note: String(draft.note || ''),
    createdAt: context.nowISO || new Date().toISOString(),
  };
  return next;
}
