const HEADERS = [
  'Date',
  'Type',
  'Amount',
  'Category',
  'Note',
  'Payment method',
  'Wife reimbursement',
  'Liability status',
  'Cycle',
];

function neutralizeFormula(value) {
  const text = String(value ?? '');
  return /^\s*[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function quote(value, formulaSafe = true) {
  const text = formulaSafe ? neutralizeFormula(value) : String(value ?? '');
  return '"' + text.replaceAll('"', '""') + '"';
}

export function exportTransactionsCsv(state) {
  const transactions = Object.values(state?.transactions || {}).filter(Boolean).sort((left, right) => (
    String(left.date || '').localeCompare(String(right.date || ''))
      || String(left.id || '').localeCompare(String(right.id || ''))
  ));
  const rows = [HEADERS.map(header => quote(header)).join(',')];
  for (const transaction of transactions) {
    const category = state.categories?.[transaction.categoryId];
    const signedAmount = transaction.isRefund ? -Number(transaction.amount) : Number(transaction.amount);
    rows.push([
      quote(transaction.date, false),
      quote(transaction.isRefund ? 'Refund' : 'Expense'),
      quote(signedAmount.toFixed(2), false),
      quote(category?.name || 'Unknown category'),
      quote(transaction.note || ''),
      quote(transaction.isCredit ? 'Card' : 'Cash'),
      quote(transaction.byWife ? 'Yes' : 'No'),
      quote(transaction.isCredit ? (transaction.liabilitySettled ? 'Settled' : 'Outstanding') : '—'),
      quote(transaction.cycleId || ''),
    ].join(','));
  }
  return '\uFEFF' + rows.join('\r\n');
}

export { neutralizeFormula };
