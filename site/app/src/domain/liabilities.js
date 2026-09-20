function signedAmount(transaction) {
  const amount = Number(transaction.amount) || 0;
  return transaction.isRefund ? -amount : amount;
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
