import { createEmptyState, validateState } from './model.js';

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const STATE_KEYS = new Set(['schemaVersion', 'settings', 'categories', 'cycles', 'transactions', 'wifePayments']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function backupError(issues, message = 'Backup is invalid') {
  const details = issues.map(issue => (issue.path || 'root') + ' ' + issue.message).join('; ');
  const error = new Error(message + ': ' + details);
  error.name = 'BackupValidationError';
  error.code = 'BACKUP_INVALID';
  error.issues = issues;
  return error;
}

function inspectStructure(value, path = '', depth = 0) {
  if (depth > 32) throw backupError([{ path, message: 'nesting exceeds 32 levels' }]);
  if (value === null || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    const childPath = path ? path + '.' + key : key;
    if (FORBIDDEN_KEYS.has(key)) throw backupError([{ path: childPath, message: 'forbidden object key' }]);
    inspectStructure(value[key], childPath, depth + 1);
  }
}

function entries(value) {
  return isRecord(value) ? Object.entries(value) : [];
}

function stableId(current, mapKey, prefix, options, warnings) {
  if (typeof current === 'string' && current) return current;
  if (typeof mapKey === 'string' && mapKey) {
    warnings.push(prefix + ' ' + mapKey + ' was missing its embedded id; the map key was retained');
    return mapKey;
  }
  const generated = options.idFactory(prefix);
  warnings.push(prefix + ' was missing an id; generated ' + generated);
  return generated;
}

export function migrateOriginalV1(input, options = {}) {
  const settingsDefaults = createEmptyState().settings;
  const nowISO = options.nowISO || new Date().toISOString();
  const idFactory = options.idFactory || (prefix => prefix + '-' + crypto.randomUUID());
  const migrationOptions = { ...options, nowISO, idFactory };
  const source = clone(input);
  const warnings = [];
  const state = {
    schemaVersion: 1,
    settings: {
      currency: source.settings?.currency ?? settingsDefaults.currency,
      salaryDay: source.settings?.salaryDay ?? settingsDefaults.salaryDay,
      theme: source.settings?.theme ?? settingsDefaults.theme,
      activeCycleId: source.settings?.activeCycleId ?? settingsDefaults.activeCycleId,
      locale: source.settings?.locale ?? settingsDefaults.locale,
      lastUsedCategoryId: source.settings?.lastUsedCategoryId ?? settingsDefaults.lastUsedCategoryId,
      localTimestamps: source.settings?.localTimestamps ?? settingsDefaults.localTimestamps,
      wifeTracking: source.settings?.wifeTracking ?? settingsDefaults.wifeTracking,
    },
    categories: {},
    cycles: {},
    transactions: {},
    wifePayments: {},
  };

  const categoryRemap = new Map();
  for (const [key, original] of entries(source.categories)) {
    if (!isRecord(original)) {
      state.categories[key] = original;
      continue;
    }
    const id = stableId(original.id, key, 'category', migrationOptions, warnings);
    categoryRemap.set(key, id);
    state.categories[key] = {
      id,
      name: original.name,
      icon: original.icon ?? '•',
      color: original.color ?? '#6B7780',
      order: original.order ?? 0,
      isArchived: original.isArchived ?? false,
      createdAt: original.createdAt ?? nowISO,
      budget: original.budget ?? 0,
      budgetPeriod: original.budgetPeriod ?? 'monthly',
    };
  }

  const cycleRemap = new Map();
  for (const [key, original] of entries(source.cycles)) {
    if (!isRecord(original)) {
      state.cycles[key] = original;
      continue;
    }
    const id = stableId(original.id, key, 'cycle', migrationOptions, warnings);
    cycleRemap.set(key, id);
    state.cycles[key] = {
      id,
      startDate: original.startDate,
      endDate: original.endDate,
      startBudget: original.startBudget,
      archivedAt: original.archivedAt ?? null,
      createdAt: original.createdAt ?? nowISO,
    };
  }

  for (const [key, original] of entries(source.transactions)) {
    if (!isRecord(original)) {
      state.transactions[key] = original;
      continue;
    }
    const id = stableId(original.id, key, 'transaction', migrationOptions, warnings);
    const byWife = original.byWife ?? false;
    state.transactions[key] = {
      id,
      cycleId: cycleRemap.get(original.cycleId) || original.cycleId,
      categoryId: categoryRemap.get(original.categoryId) || original.categoryId,
      date: original.date,
      amount: original.amount,
      kind: original.kind || (original.isRefund ? 'refund' : 'expense'),
      isRefund: original.kind ? original.kind !== 'expense' : (original.isRefund ?? false),
      isExcludedFromPace: byWife ? true : (original.isExcludedFromPace ?? false),
      exclusionSource: byWife ? 'wife' : (original.exclusionSource ?? null),
      isCredit: byWife ? true : (original.isCredit ?? false),
      creditSource: byWife ? (original.creditSource ?? 'wife') : (original.creditSource ?? null),
      liabilitySettled: original.liabilitySettled ?? false,
      settledAt: original.settledAt ?? null,
      byWife,
      wifeSettled: original.wifeSettled ?? false,
      wifeSettledAt: original.wifeSettledAt ?? null,
      note: original.note ?? '',
      createdAt: original.createdAt ?? nowISO,
      updatedAt: original.updatedAt ?? original.createdAt ?? nowISO,
      source: original.source ?? null,
    };
  }

  for (const [key, original] of entries(source.wifePayments)) {
    if (!isRecord(original)) {
      state.wifePayments[key] = original;
      continue;
    }
    const id = stableId(original.id, key, 'wife-payment', migrationOptions, warnings);
    state.wifePayments[key] = {
      id,
      amount: original.amount,
      date: original.date,
      note: original.note ?? '',
      createdAt: original.createdAt ?? nowISO,
    };
  }

  state.settings.activeCycleId = cycleRemap.get(state.settings.activeCycleId) || state.settings.activeCycleId;
  state.settings.lastUsedCategoryId = categoryRemap.get(state.settings.lastUsedCategoryId) || state.settings.lastUsedCategoryId;
  return { state, warnings };
}

function parseBackup(text) {
  if (typeof text !== 'string') throw backupError([{ path: '', message: 'backup must be text' }]);
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw backupError([{ path: '', message: 'backup exceeds the 5 MiB limit' }]);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw backupError([{ path: '', message: 'backup is not valid JSON' }]);
  }
}

export function inspectBackup(text, options = {}) {
  const parsed = parseBackup(text);
  inspectStructure(parsed);
  let source;
  let sourceVersion;
  if (isRecord(parsed) && parsed.format === 'spending-tracker-next-backup' && parsed.version === 1) {
    source = parsed.state;
    sourceVersion = 'spending-tracker-next-v1';
  } else if (isRecord(parsed) && parsed.schemaVersion === 1) {
    source = parsed;
    sourceVersion = 'original-v1';
  } else {
    throw backupError([{ path: 'schemaVersion', message: 'unsupported backup format' }]);
  }

  const unsupportedKeys = Object.keys(source || {}).filter(key => !STATE_KEYS.has(key));
  if (unsupportedKeys.length > 0) {
    throw backupError(unsupportedKeys.map(path => ({ path, message: 'unsupported top-level collection' })));
  }

  const before = JSON.stringify(source);
  const result = migrateOriginalV1(source, options);
  if (JSON.stringify(source) !== before) throw new Error('migration mutated its source');
  const validation = validateState(result.state);
  if (!validation.ok) throw backupError(validation.issues);

  return {
    candidate: result.state,
    sourceVersion,
    counts: {
      categories: Object.keys(result.state.categories).length,
      cycles: Object.keys(result.state.cycles).length,
      transactions: Object.keys(result.state.transactions).length,
      wifePayments: Object.keys(result.state.wifePayments).length,
    },
    warnings: result.warnings,
  };
}

export function serializeBackup(state, { exportedAt = new Date().toISOString() } = {}) {
  const validation = validateState(state);
  if (!validation.ok) throw backupError(validation.issues, 'State cannot be exported');
  return JSON.stringify({
    format: 'spending-tracker-next-backup',
    version: 1,
    exportedAt,
    state,
  }, null, 2);
}

export { MAX_BACKUP_BYTES };
