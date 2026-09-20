import { inspectBackup } from './domain/backup.js';
import {
  addTransaction,
  deleteTransaction,
  reassignCategory,
  setWifeTracking,
  updateTransaction,
} from './domain/transactions.js';

function clone(value) {
  return structuredClone(value);
}

function storeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function reduce(state, command, context) {
  switch (command.type) {
    case 'transaction/add':
      return addTransaction(state, command.payload, context);
    case 'transaction/update':
      return updateTransaction(state, command.payload.id, command.payload.patch, context);
    case 'transaction/delete':
      return deleteTransaction(state, command.payload.id);
    case 'category/reassign':
      return reassignCategory(state, command.payload.fromId, command.payload.toId);
    case 'settings/wifeTracking':
      return setWifeTracking(state, command.payload.enabled);
    default:
      throw storeError('UNKNOWN_COMMAND', 'Unknown command: ' + command.type);
  }
}

export function createAppStore(options = {}) {
  const persist = options.persist;
  if (!persist || typeof persist.save !== 'function') throw new TypeError('persist.save is required');
  let state = clone(options.initialState);
  const listeners = new Set();
  const submissions = new Map();
  const nowMs = options.nowMs || (() => Date.now());
  let dispatching = false;

  function notify() {
    for (const listener of listeners) listener(clone(state));
  }

  return {
    getState() {
      return clone(state);
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(command) {
      if (dispatching) throw storeError('REENTRANT_DISPATCH', 'Dispatch is already in progress');
      const timestamp = nowMs();
      for (const [id, recordedAt] of submissions) {
        if (timestamp - recordedAt > 10_000) submissions.delete(id);
      }
      if (command.submissionId && submissions.has(command.submissionId)) {
        throw storeError('DUPLICATE_SUBMISSION', 'This submission was already saved');
      }

      dispatching = true;
      try {
        const candidate = reduce(state, command, options.context || {});
        persist.save(candidate);
        state = candidate;
        if (command.submissionId) submissions.set(command.submissionId, timestamp);
        notify();
        return clone(state);
      } finally {
        dispatching = false;
      }
    },
    previewRestore(text) {
      return inspectBackup(text, options.backupOptions || {});
    },
    async commitRestore(preview) {
      if (!preview?.candidate) throw storeError('RESTORE_PREVIEW_REQUIRED', 'A validated restore preview is required');
      if (dispatching) throw storeError('REENTRANT_DISPATCH', 'Dispatch is already in progress');
      dispatching = true;
      try {
        const candidate = clone(preview.candidate);
        await persist.save(candidate);
        state = candidate;
        notify();
        return clone(state);
      } finally {
        dispatching = false;
      }
    },
  };
}
