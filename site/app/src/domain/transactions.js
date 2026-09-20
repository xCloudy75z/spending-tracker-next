import { cycleForDate } from './cycles.js';
import { validateState } from './model.js';

function clone(value) {
  return structuredClone(value);
}

function commandError(code, message, issues = []) {
  const error = new Error(message);
  error.code = code;
  error.issues = issues;
  return error;
}

function assertValid(state) {
  const result = validateState(state);
  if (!result.ok) throw commandError('STATE_INVALID', 'Command would create invalid state', result.issues);
}

function nextId(context, prefix) {
  if (typeof context?.idFactory === 'function') return context.idFactory(prefix);
  return prefix + '-' + crypto.randomUUID();
}

function normalizeTransaction(state, draft, context, current = null) {
  const date = draft.date ?? current?.date;
  const cycle = cycleForDate(state, date);
  if (!cycle) throw commandError('DATE_OUTSIDE_CYCLES', 'Transaction date is outside every cycle');

  const byWife = Boolean(draft.byWife ?? current?.byWife ?? false);
  let creditSource = draft.creditSource ?? current?.creditSource ?? null;
  let exclusionSource = draft.exclusionSource ?? current?.exclusionSource ?? null;
  let isCredit = Boolean(draft.isCredit ?? current?.isCredit ?? false);
  let isExcludedFromPace = Boolean(draft.isExcludedFromPace ?? current?.isExcludedFromPace ?? false);
  if (byWife) {
    if (!creditSource) creditSource = isCredit ? 'explicit' : 'wife';
    if (!exclusionSource) exclusionSource = 'wife';
    isCredit = true;
    isExcludedFromPace = true;
  } else {
    if (creditSource === 'wife') {
      creditSource = null;
      isCredit = false;
    }
    if (exclusionSource === 'wife') {
      exclusionSource = null;
      isExcludedFromPace = false;
    }
  }

  const nowISO = context?.nowISO || new Date().toISOString();
  return {
    ...current,
    ...draft,
    id: current?.id || draft.id || nextId(context, 'transaction'),
    cycleId: cycle.id,
    categoryId: draft.categoryId ?? current?.categoryId,
    date,
    amount: Math.round(Number(draft.amount ?? current?.amount) * 100) / 100,
    isRefund: Boolean(draft.isRefund ?? current?.isRefund ?? false),
    isExcludedFromPace,
    exclusionSource,
    isCredit,
    creditSource,
    liabilitySettled: Boolean(draft.liabilitySettled ?? current?.liabilitySettled ?? false),
    settledAt: draft.settledAt ?? current?.settledAt ?? null,
    byWife,
    wifeSettled: byWife ? Boolean(draft.wifeSettled ?? current?.wifeSettled ?? false) : false,
    wifeSettledAt: byWife ? (draft.wifeSettledAt ?? current?.wifeSettledAt ?? null) : null,
    note: String(draft.note ?? current?.note ?? ''),
    createdAt: current?.createdAt || draft.createdAt || nowISO,
    updatedAt: nowISO,
  };
}

export function addTransaction(state, draft, context = {}) {
  const next = clone(state);
  const transaction = normalizeTransaction(next, draft, context);
  if (next.transactions[transaction.id]) throw commandError('DUPLICATE_ID', 'Transaction id already exists');
  next.transactions[transaction.id] = transaction;
  assertValid(next);
  return next;
}

export function updateTransaction(state, id, patch, context = {}) {
  if (!state.transactions?.[id]) throw commandError('NOT_FOUND', 'Transaction not found');
  const next = clone(state);
  next.transactions[id] = normalizeTransaction(next, patch, context, next.transactions[id]);
  assertValid(next);
  return next;
}

export function deleteTransaction(state, id) {
  if (!state.transactions?.[id]) throw commandError('NOT_FOUND', 'Transaction not found');
  const next = clone(state);
  delete next.transactions[id];
  assertValid(next);
  return next;
}

export function reassignCategory(state, fromId, toId) {
  if (!state.categories?.[toId]) throw commandError('CATEGORY_NOT_FOUND', 'Target category not found');
  const next = clone(state);
  for (const transaction of Object.values(next.transactions)) {
    if (transaction.categoryId === fromId) transaction.categoryId = toId;
  }
  assertValid(next);
  return next;
}

export function setWifeTracking(state, enabled) {
  const next = clone(state);
  next.settings.wifeTracking = Boolean(enabled);
  if (!enabled) {
    for (const transaction of Object.values(next.transactions)) {
      if (!transaction.byWife) continue;
      transaction.byWife = false;
      transaction.wifeSettled = false;
      transaction.wifeSettledAt = null;
      if (transaction.creditSource !== 'explicit') {
        transaction.isCredit = false;
        transaction.creditSource = null;
      }
      if (transaction.exclusionSource === 'wife' || transaction.exclusionSource == null) {
        transaction.isExcludedFromPace = false;
        transaction.exclusionSource = null;
      }
    }
  }
  assertValid(next);
  return next;
}
