import { createEmptyState, validateState } from '../domain/model.js';

export const STORAGE_KEY = 'spending-tracker-next:state:v1';
export const SNAPSHOT_KEY = 'spending-tracker-next:snapshot:v1';
export const META_KEY = 'spending-tracker-next:meta:v1';

function typedWriteError(error) {
  const wrapped = new Error('STORAGE_WRITE_FAILED: ' + (error?.message || 'unknown storage error'));
  wrapped.code = 'STORAGE_WRITE_FAILED';
  wrapped.reason = error?.name === 'QuotaExceededError' ? 'quota' : 'unavailable';
  wrapped.cause = error;
  return wrapped;
}

function parseState(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const state = JSON.parse(raw);
    return validateState(state).ok ? state : null;
  } catch {
    return null;
  }
}

function restoreValue(adapter, key, value) {
  if (value === null) adapter.removeItem(key);
  else adapter.setItem(key, value);
}

export function createStorage(adapter, options = {}) {
  if (!adapter || typeof adapter.getItem !== 'function' || typeof adapter.setItem !== 'function') {
    throw new TypeError('A localStorage-compatible adapter is required');
  }
  const nowISO = options.nowISO || (() => new Date().toISOString());

  return {
    adapter,
    save(state) {
      const validation = validateState(state);
      if (!validation.ok) {
        const error = new Error('STATE_INVALID');
        error.code = 'STATE_INVALID';
        error.issues = validation.issues;
        throw error;
      }
      const serialized = JSON.stringify(state);
      let previousState;
      let previousSnapshot;
      let previousMeta;
      try {
        previousState = adapter.getItem(STORAGE_KEY);
        previousSnapshot = adapter.getItem(SNAPSHOT_KEY);
        previousMeta = adapter.getItem(META_KEY);
      } catch (error) {
        throw typedWriteError(error);
      }

      try {
        if (previousState !== null) adapter.setItem(SNAPSHOT_KEY, previousState);
        adapter.setItem(STORAGE_KEY, serialized);
        if (adapter.getItem(STORAGE_KEY) !== serialized) throw new Error('state read-back mismatch');
        const timestamp = typeof nowISO === 'function' ? nowISO() : nowISO;
        adapter.setItem(META_KEY, JSON.stringify({ lastSavedAt: timestamp }));
        return { ok: true, savedAt: timestamp };
      } catch (error) {
        try {
          restoreValue(adapter, STORAGE_KEY, previousState);
          restoreValue(adapter, SNAPSHOT_KEY, previousSnapshot);
          restoreValue(adapter, META_KEY, previousMeta);
        } catch {
          // Preserve the original storage failure as the actionable cause.
        }
        throw typedWriteError(error);
      }
    },
    load() {
      let raw;
      let snapshotRaw;
      try {
        raw = adapter.getItem(STORAGE_KEY);
        snapshotRaw = adapter.getItem(SNAPSHOT_KEY);
      } catch (error) {
        return { status: 'unavailable', state: null, error };
      }
      if (raw === null && snapshotRaw === null) {
        return { status: 'empty', state: createEmptyState(), raw: null };
      }
      const state = parseState(raw);
      if (state) return { status: 'ready', state: structuredClone(state), raw };
      const snapshot = parseState(snapshotRaw);
      if (snapshot) {
        return {
          status: 'recovered-snapshot',
          state: structuredClone(snapshot),
          corruptRaw: raw,
          snapshotRaw,
        };
      }
      return { status: 'corrupt', state: null, raw, snapshotRaw };
    },
    metadata() {
      try {
        const raw = adapter.getItem(META_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    },
    markBackup(timestamp = nowISO()) {
      let metadata = {};
      try {
        const raw = adapter.getItem(META_KEY);
        metadata = raw ? JSON.parse(raw) : {};
        metadata.lastBackupAt = timestamp;
        adapter.setItem(META_KEY, JSON.stringify(metadata));
        return structuredClone(metadata);
      } catch (error) {
        throw typedWriteError(error);
      }
    },
  };
}
