import { cycleForDate } from './cycles.js';
import { isValidISODate } from './dates.js';

function amount(value) {
  return Math.round(Number(String(value).replaceAll(',', '')) * 100) / 100;
}

function purchase(line) {
  const match = line.match(/Trx\.\s*of\s*AED\s?([\d,]+(?:\.\d{1,2})?)\b.*?\bat\s+(.+),\s*([A-Za-z.\s]+?)\s+is\s+(\w+)\b/i);
  if (!match) return null;
  const dateMatch = line.match(/Trx\s*Date:\s*(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/i);
  const dateISO = dateMatch ? '20' + dateMatch[3] + '-' + dateMatch[2] + '-' + dateMatch[1] : null;
  let status = /^approved$/i.test(match[4]) ? 'approved' : 'declined';
  if (dateISO && !isValidISODate(dateISO)) status = 'invalid-date';
  return {
    raw: line,
    kind: 'purchase',
    status,
    amount: amount(match[1]),
    note: match[2].trim(),
    dateISO,
    timeHHMM: dateMatch ? dateMatch[4] + ':' + dateMatch[5] : null,
    duplicateOf: null,
  };
}

function debit(line) {
  const match = line.match(/AED\s?([\d,]+(?:\.\d{1,2})?)\s+was\s+debited\s+from\s+your\s+account/i);
  if (!match) return null;
  return {
    raw: line,
    kind: 'debit',
    status: 'approved',
    amount: amount(match[1]),
    note: 'Account debit',
    dateISO: null,
    timeHHMM: null,
    duplicateOf: null,
  };
}

function duplicateKey(row) {
  if (row.kind === 'purchase') {
    return [row.amount.toFixed(2), row.note.toUpperCase(), row.dateISO || '', row.timeHHMM || ''].join('|');
  }
  return row.amount.toFixed(2) + '|' + row.raw;
}

export function parseSms(text) {
  const rows = [];
  const unrecognized = [];
  const seen = new Map();
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const row = purchase(line) || debit(line);
    if (!row) {
      unrecognized.push(line);
      continue;
    }
    const key = duplicateKey(row);
    if (seen.has(key)) row.duplicateOf = seen.get(key);
    else seen.set(key, rows.length);
    rows.push(row);
  }
  return { rows, unrecognized };
}

function typedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function prepareSmsTransactions(state, parsed, options = {}) {
  if (!options.confirm) throw typedError('CONFIRM_REQUIRED', 'SMS import must be confirmed');
  if (!state.categories?.[options.categoryId]) throw typedError('CATEGORY_NOT_FOUND', 'Selected category does not exist');
  const context = options.context || {};
  const transactions = [];
  const skipped = [];
  for (const row of parsed?.rows || []) {
    if (row.status !== 'approved') {
      skipped.push({ row, reason: row.status === 'declined' ? 'declined' : 'invalid-date' });
      continue;
    }
    if (row.duplicateOf !== null) {
      skipped.push({ row, reason: 'duplicate' });
      continue;
    }
    const date = row.dateISO || options.defaultDate;
    const cycle = date && cycleForDate(state, date);
    if (!cycle) {
      skipped.push({ row, reason: 'out-of-cycle' });
      continue;
    }
    const id = typeof context.idFactory === 'function'
      ? context.idFactory('sms-transaction')
      : 'sms-transaction-' + crypto.randomUUID();
    const nowISO = context.nowISO || new Date().toISOString();
    const byWife = Boolean(options.byWife);
    transactions.push({
      id,
      cycleId: cycle.id,
      categoryId: options.categoryId,
      date,
      amount: row.amount,
      isRefund: false,
      isExcludedFromPace: byWife,
      exclusionSource: byWife ? 'wife' : null,
      isCredit: byWife || row.kind === 'purchase' || Boolean(options.isCredit),
      creditSource: row.kind === 'purchase' || options.isCredit ? 'explicit' : (byWife ? 'wife' : null),
      liabilitySettled: false,
      settledAt: null,
      byWife,
      wifeSettled: false,
      wifeSettledAt: null,
      note: row.note,
      createdAt: nowISO,
      updatedAt: nowISO,
      source: 'sms',
    });
  }
  return { transactions, skipped, unrecognized: parsed?.unrecognized || [] };
}
