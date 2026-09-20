import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppStore } from '../../site/app/src/app-store.js';
import { createEmptyState } from '../../site/app/src/domain/model.js';
import { serializeBackup } from '../../site/app/src/domain/backup.js';

test('failed restore preserves current state and snapshot', async () => {
  const initialState = createEmptyState();
  const replacement = createEmptyState();
  replacement.settings.locale = 'ar';
  const validBackup = serializeBackup(replacement, { exportedAt: '2026-09-20T12:00:00.000+04:00' });
  const quotaFailingStorage = {
    save() {
      const error = new Error('STORAGE_WRITE_FAILED');
      error.code = 'STORAGE_WRITE_FAILED';
      throw error;
    },
  };
  const store = createAppStore({
    initialState,
    persist: quotaFailingStorage,
    backupOptions: {
      nowISO: '2026-09-20T12:00:00.000+04:00',
      idFactory: prefix => prefix + '-generated',
    },
  });
  const preview = store.previewRestore(validBackup);
  await assert.rejects(() => store.commitRestore(preview), /STORAGE_WRITE_FAILED/);
  assert.deepEqual(store.getState(), initialState);
});

test('successful restore commits only the exact inspected candidate', async () => {
  const initialState = createEmptyState();
  const replacement = createEmptyState();
  replacement.settings.locale = 'ar';
  const validBackup = serializeBackup(replacement, { exportedAt: '2026-09-20T12:00:00.000+04:00' });
  let saved;
  const store = createAppStore({
    initialState,
    persist: { save(state) { saved = structuredClone(state); } },
  });
  const preview = store.previewRestore(validBackup);
  await store.commitRestore(preview);
  assert.deepEqual(store.getState(), preview.candidate);
  assert.deepEqual(saved, preview.candidate);
});
