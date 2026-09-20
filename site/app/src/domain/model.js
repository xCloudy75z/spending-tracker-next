import { isValidISODate } from './dates.js';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const MAX_MONEY = 999_999_999.99;
const ROOT_KEYS = new Set(['schemaVersion', 'settings', 'categories', 'cycles', 'transactions', 'wifePayments']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function addIssue(issues, path, message) {
  issues.push({ path, message });
}

function validText(value, maxLength) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maxLength
    && !CONTROL_PATTERN.test(value);
}

function validOptionalText(value, maxLength) {
  return value == null || (typeof value === 'string' && value.length <= maxLength && !CONTROL_PATTERN.test(value));
}

function validOptionalInstant(value) {
  return value == null || (typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value)));
}

function validMoney(value, allowZero = false) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= (allowZero ? 0 : 0.01)
    && value <= MAX_MONEY;
}

function validateCollection(value, path, issues) {
  if (!isRecord(value)) {
    addIssue(issues, path, 'must be an object map');
    return false;
  }
  return true;
}

function validateEntityIdentity(mapKey, entity, path, seen, issues) {
  if (!ID_PATTERN.test(mapKey)) addIssue(issues, path, 'map key is not a valid id');
  if (!ID_PATTERN.test(String(entity.id || ''))) addIssue(issues, path + '.id', 'must be a valid id');
  if (entity.id !== mapKey) addIssue(issues, path + '.id', 'must match its map key');
  if (seen.has(entity.id)) addIssue(issues, path + '.id', 'duplicate entity id');
  else seen.add(entity.id);
}

function scanStructure(value, path, depth, issues, seen) {
  if (depth > 32) {
    addIssue(issues, path, 'nesting exceeds 32 levels');
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) {
    addIssue(issues, path, 'contains a circular reference');
    return;
  }
  seen.add(value);
  for (const key of Object.keys(value)) {
    const childPath = path ? path + '.' + key : key;
    if (FORBIDDEN_KEYS.has(key)) addIssue(issues, childPath, 'forbidden object key');
    scanStructure(value[key], childPath, depth + 1, issues, seen);
  }
}

export function createEmptyState() {
  return {
    schemaVersion: 1,
    settings: {
      currency: 'AED',
      salaryDay: 25,
      theme: 'system',
      activeCycleId: null,
      locale: 'en',
      lastUsedCategoryId: null,
      localTimestamps: true,
      wifeTracking: true,
    },
    categories: {},
    cycles: {},
    transactions: {},
    wifePayments: {},
  };
}

export function validateState(state) {
  const issues = [];
  if (!isRecord(state)) return { ok: false, issues: [{ path: '', message: 'state must be an object' }] };
  scanStructure(state, '', 0, issues, new WeakSet());
  for (const key of Object.keys(state)) {
    if (!ROOT_KEYS.has(key)) addIssue(issues, key, 'unsupported top-level collection');
  }
  if (state.schemaVersion !== 1) addIssue(issues, 'schemaVersion', 'must equal 1');

  if (!isRecord(state.settings)) {
    addIssue(issues, 'settings', 'must be an object');
  } else {
    const settings = state.settings;
    if (settings.currency !== 'AED') addIssue(issues, 'settings.currency', 'must equal AED');
    if (!Number.isInteger(settings.salaryDay) || settings.salaryDay < 1 || settings.salaryDay > 28) {
      addIssue(issues, 'settings.salaryDay', 'must be an integer from 1 to 28');
    }
    if (!['system', 'light', 'dark'].includes(settings.theme)) addIssue(issues, 'settings.theme', 'must be system, light, or dark');
    if (!['en', 'ar'].includes(settings.locale)) addIssue(issues, 'settings.locale', 'must be en or ar');
    if (settings.activeCycleId !== null && !ID_PATTERN.test(String(settings.activeCycleId || ''))) {
      addIssue(issues, 'settings.activeCycleId', 'must be null or a valid id');
    }
    if (settings.lastUsedCategoryId !== null && !ID_PATTERN.test(String(settings.lastUsedCategoryId || ''))) {
      addIssue(issues, 'settings.lastUsedCategoryId', 'must be null or a valid id');
    }
    if (typeof settings.localTimestamps !== 'boolean') addIssue(issues, 'settings.localTimestamps', 'must be boolean');
    if (typeof settings.wifeTracking !== 'boolean') addIssue(issues, 'settings.wifeTracking', 'must be boolean');
  }

  const categoryNames = new Map();
  const categoryIds = new Set();
  if (validateCollection(state.categories, 'categories', issues)) {
    for (const [key, category] of Object.entries(state.categories)) {
      const path = 'categories.' + key;
      if (!isRecord(category)) {
        addIssue(issues, path, 'must be an object');
        continue;
      }
      validateEntityIdentity(key, category, path, categoryIds, issues);
      if (!validText(category.name, 40)) addIssue(issues, path + '.name', 'must be 1-40 safe characters');
      else {
        const normalized = category.name.trim().toLocaleLowerCase('en');
        if (categoryNames.has(normalized)) addIssue(issues, path + '.name', 'duplicates another category name');
        else categoryNames.set(normalized, key);
      }
      if (!validOptionalText(category.icon, 16)) addIssue(issues, path + '.icon', 'must be at most 16 safe characters');
      if (!COLOR_PATTERN.test(String(category.color || ''))) addIssue(issues, path + '.color', 'must be a six-digit hex color');
      if (!Number.isInteger(category.order) || category.order < 0) addIssue(issues, path + '.order', 'must be a non-negative integer');
      if (typeof category.isArchived !== 'boolean') addIssue(issues, path + '.isArchived', 'must be boolean');
      if (!validMoney(category.budget, true)) addIssue(issues, path + '.budget', 'must be a finite amount from 0 to 999999999.99');
      if (!['monthly', 'yearly'].includes(category.budgetPeriod)) addIssue(issues, path + '.budgetPeriod', 'must be monthly or yearly');
      if (!validOptionalInstant(category.createdAt)) addIssue(issues, path + '.createdAt', 'must be null or an ISO timestamp');
    }
  }

  const cycleIds = new Set();
  const cycleList = [];
  if (validateCollection(state.cycles, 'cycles', issues)) {
    for (const [key, cycle] of Object.entries(state.cycles)) {
      const path = 'cycles.' + key;
      if (!isRecord(cycle)) {
        addIssue(issues, path, 'must be an object');
        continue;
      }
      validateEntityIdentity(key, cycle, path, cycleIds, issues);
      if (!isValidISODate(cycle.startDate)) addIssue(issues, path + '.startDate', 'must be a valid ISO date');
      if (!isValidISODate(cycle.endDate)) addIssue(issues, path + '.endDate', 'must be a valid ISO date');
      if (isValidISODate(cycle.startDate) && isValidISODate(cycle.endDate) && cycle.endDate < cycle.startDate) {
        addIssue(issues, path + '.endDate', 'must not be before startDate');
      }
      if (!validMoney(cycle.startBudget)) addIssue(issues, path + '.startBudget', 'must be a finite positive amount');
      if (!validOptionalInstant(cycle.archivedAt)) addIssue(issues, path + '.archivedAt', 'must be null or an ISO timestamp');
      if (!validOptionalInstant(cycle.createdAt)) addIssue(issues, path + '.createdAt', 'must be null or an ISO timestamp');
      cycleList.push({ key, cycle });
    }
  }
  cycleList.sort((left, right) => String(left.cycle.startDate).localeCompare(String(right.cycle.startDate)));
  for (let index = 1; index < cycleList.length; index += 1) {
    const previous = cycleList[index - 1];
    const current = cycleList[index];
    if (isValidISODate(previous.cycle.endDate)
      && isValidISODate(current.cycle.startDate)
      && current.cycle.startDate <= previous.cycle.endDate) {
      addIssue(issues, 'cycles.' + current.key + '.startDate', 'overlaps cycle ' + previous.key);
    }
  }

  const transactionIds = new Set();
  if (validateCollection(state.transactions, 'transactions', issues)) {
    for (const [key, transaction] of Object.entries(state.transactions)) {
      const path = 'transactions.' + key;
      if (!isRecord(transaction)) {
        addIssue(issues, path, 'must be an object');
        continue;
      }
      validateEntityIdentity(key, transaction, path, transactionIds, issues);
      if (!cycleIds.has(transaction.cycleId)) addIssue(issues, path + '.cycleId', 'references a missing cycle');
      if (!categoryIds.has(transaction.categoryId)) addIssue(issues, path + '.categoryId', 'references a missing category');
      if (!isValidISODate(transaction.date)) addIssue(issues, path + '.date', 'must be a valid ISO date');
      const cycle = state.cycles?.[transaction.cycleId];
      if (cycle && isValidISODate(transaction.date)
        && (transaction.date < cycle.startDate || transaction.date > cycle.endDate)) {
        addIssue(issues, path + '.date', 'must fall within its cycle');
      }
      if (!validMoney(transaction.amount)) addIssue(issues, path + '.amount', 'must be a finite positive amount');
      if (transaction.kind !== undefined && !['expense', 'income', 'refund'].includes(transaction.kind)) {
        addIssue(issues, path + '.kind', 'must be expense, income, or refund');
      }
      if (transaction.kind !== undefined && transaction.isRefund !== (transaction.kind !== 'expense')) {
        addIssue(issues, path + '.isRefund', 'must match transaction kind');
      }
      if (!validOptionalText(transaction.note ?? '', 500)) addIssue(issues, path + '.note', 'must be at most 500 safe characters');
      if (![null, 'wife'].includes(transaction.exclusionSource ?? null)) addIssue(issues, path + '.exclusionSource', 'must be null or wife');
      if (![null, 'explicit', 'wife'].includes(transaction.creditSource ?? null)) addIssue(issues, path + '.creditSource', 'must be null, explicit, or wife');
      if (![null, 'sms', 'manual'].includes(transaction.source ?? null)) addIssue(issues, path + '.source', 'must be null, sms, or manual');
      for (const timestamp of ['settledAt', 'wifeSettledAt', 'createdAt', 'updatedAt']) {
        if (!validOptionalInstant(transaction[timestamp])) addIssue(issues, path + '.' + timestamp, 'must be null or an ISO timestamp');
      }
      for (const flag of ['isRefund', 'isExcludedFromPace', 'isCredit', 'liabilitySettled', 'byWife', 'wifeSettled']) {
        if (typeof transaction[flag] !== 'boolean') addIssue(issues, path + '.' + flag, 'must be boolean');
      }
      if (transaction.byWife && (!transaction.isCredit || !transaction.isExcludedFromPace)) {
        addIssue(issues, path + '.byWife', 'wife purchases must be credit and excluded from pace');
      }
    }
  }

  const paymentIds = new Set();
  if (validateCollection(state.wifePayments, 'wifePayments', issues)) {
    for (const [key, payment] of Object.entries(state.wifePayments)) {
      const path = 'wifePayments.' + key;
      if (!isRecord(payment)) {
        addIssue(issues, path, 'must be an object');
        continue;
      }
      validateEntityIdentity(key, payment, path, paymentIds, issues);
      if (!validMoney(payment.amount)) addIssue(issues, path + '.amount', 'must be a finite positive amount');
      if (!isValidISODate(payment.date)) addIssue(issues, path + '.date', 'must be a valid ISO date');
      if (!validOptionalText(payment.note ?? '', 500)) addIssue(issues, path + '.note', 'must be at most 500 safe characters');
      if (!validOptionalInstant(payment.createdAt)) addIssue(issues, path + '.createdAt', 'must be null or an ISO timestamp');
    }
  }

  if (state.settings?.activeCycleId !== null && !cycleIds.has(state.settings?.activeCycleId)) {
    addIssue(issues, 'settings.activeCycleId', 'references a missing cycle');
  }
  if (state.settings?.lastUsedCategoryId !== null && !categoryIds.has(state.settings?.lastUsedCategoryId)) {
    addIssue(issues, 'settings.lastUsedCategoryId', 'references a missing category');
  }
  return { ok: issues.length === 0, issues };
}
