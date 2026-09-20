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

export function addCategory(state, draft, context = {}) {
  const next = clone(state);
  const id = draft.id || nextId(context, 'category');
  if (next.categories[id]) throw commandError('DUPLICATE_ID', 'Category id already exists');
  next.categories[id] = {
    id,
    name: String(draft.name || '').trim(),
    icon: String(draft.icon || '').slice(0, 16),
    color: draft.color || '#24766B',
    order: Number.isInteger(draft.order) ? draft.order : Object.keys(next.categories).length,
    isArchived: false,
    budget: Math.round(Number(draft.budget || 0) * 100) / 100,
    budgetPeriod: draft.budgetPeriod || 'monthly',
  };
  next.settings.lastUsedCategoryId ||= id;
  assertValid(next);
  return next;
}

export function updateCategory(state, id, patch) {
  if (!state.categories?.[id]) throw commandError('CATEGORY_NOT_FOUND', 'Category not found');
  const next = clone(state);
  const category = next.categories[id];
  if (patch.name !== undefined) category.name = String(patch.name).trim();
  if (patch.budget !== undefined) category.budget = Math.round(Number(patch.budget) * 100) / 100;
  if (patch.color !== undefined) category.color = patch.color;
  if (patch.icon !== undefined) category.icon = String(patch.icon).slice(0, 16);
  assertValid(next);
  return next;
}

export function archiveCategory(state, id, reassignTo = null) {
  const category = state.categories?.[id];
  if (!category) throw commandError('CATEGORY_NOT_FOUND', 'Category not found');
  const references = Object.values(state.transactions || {}).filter(transaction => transaction.categoryId === id);
  if (references.length && !reassignTo) {
    throw commandError('CATEGORY_IN_USE', 'Referenced categories must be reassigned before archiving');
  }
  if (reassignTo && (!state.categories?.[reassignTo] || reassignTo === id || state.categories[reassignTo].isArchived)) {
    throw commandError('CATEGORY_REASSIGN_INVALID', 'Choose another active category');
  }
  const next = clone(state);
  for (const transaction of Object.values(next.transactions || {})) {
    if (transaction.categoryId === id) transaction.categoryId = reassignTo;
  }
  next.categories[id].isArchived = true;
  if (next.settings.lastUsedCategoryId === id) next.settings.lastUsedCategoryId = reassignTo;
  assertValid(next);
  return next;
}

export function addCycle(state, draft, context = {}) {
  const next = clone(state);
  const id = draft.id || nextId(context, 'cycle');
  if (next.cycles[id]) throw commandError('DUPLICATE_ID', 'Cycle id already exists');
  const nowISO = context.nowISO || new Date().toISOString();
  next.cycles[id] = {
    id,
    startDate: draft.startDate,
    endDate: draft.endDate,
    startBudget: Math.round(Number(draft.startBudget) * 100) / 100,
    archivedAt: null,
    createdAt: nowISO,
  };
  const todayISO = draft.todayISO || context.todayISO || nowISO.slice(0, 10);
  if (draft.startDate <= todayISO && todayISO <= draft.endDate) {
    const previousId = next.settings.activeCycleId;
    if (previousId && previousId !== id && next.cycles[previousId]) next.cycles[previousId].archivedAt = nowISO;
    next.settings.activeCycleId = id;
  }
  assertValid(next);
  return next;
}

export function updateSettings(state, patch) {
  const next = clone(state);
  for (const key of ['locale', 'theme']) {
    if (patch[key] !== undefined) next.settings[key] = patch[key];
  }
  assertValid(next);
  return next;
}
