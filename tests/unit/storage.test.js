import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../../site/app/src/domain/model.js';
import {
  createStorage,
  META_KEY,
  SNAPSHOT_KEY,
  STORAGE_KEY,
} from '../../site/app/src/platform/storage.js';
import { fakeStorage } from '../helpers/fake-storage.js';

function quotaError() {
  const error = new Error('full');
  error.name = 'QuotaExceededError';
  return error;
}

test('storage uses only Spending Tracker Next keys on first save', () => {
  const adapter = fakeStorage();
  const storage = createStorage(adapter, { nowISO: () => '2026-09-20T12:00:00.000+04:00' });
  storage.save(createEmptyState());
  assert.deepEqual(adapter.keys(), [META_KEY, STORAGE_KEY].sort());
  assert.equal(adapter.keys().some(key => key.startsWith('spending-tracker:')), false);
});

test('storage reports empty and ready states without sharing object references', () => {
  const adapter = fakeStorage();
  const storage = createStorage(adapter);
  assert.equal(storage.load().status, 'empty');
  const state = createEmptyState();
  storage.save(state);
  const loaded = storage.load();
  assert.equal(loaded.status, 'ready');
  loaded.state.settings.locale = 'ar';
  assert.equal(state.settings.locale, 'en');
});

test('quota failure restores previous state and snapshot', () => {
  const adapter = fakeStorage();
  const storage = createStorage(adapter);
  const first = createEmptyState();
  storage.save(first);
  const second = createEmptyState();
  second.settings.locale = 'ar';
  storage.save(second);
  const stateBefore = adapter.raw(STORAGE_KEY);
  const snapshotBefore = adapter.raw(SNAPSHOT_KEY);
  const third = createEmptyState();
  third.settings.theme = 'dark';
  adapter.failNextSet(quotaError(), STORAGE_KEY);
  assert.throws(() => storage.save(third), error => error.code === 'STORAGE_WRITE_FAILED' && error.reason === 'quota');
  assert.equal(adapter.raw(STORAGE_KEY), stateBefore);
  assert.equal(adapter.raw(SNAPSHOT_KEY), snapshotBefore);
});

test('read-back mismatch rolls back and storage access errors are reported', () => {
  const adapter = fakeStorage();
  const storage = createStorage(adapter);
  storage.save(createEmptyState());
  const previous = adapter.raw(STORAGE_KEY);
  const changed = createEmptyState();
  changed.settings.theme = 'dark';
  adapter.mismatchNextRead(STORAGE_KEY, 'mismatch');
  assert.throws(() => storage.save(changed), error => error.code === 'STORAGE_WRITE_FAILED');
  assert.equal(adapter.raw(STORAGE_KEY), previous);

  const denied = fakeStorage();
  const securityError = new Error('denied');
  securityError.name = 'SecurityError';
  denied.failReads(securityError);
  assert.equal(createStorage(denied).load().status, 'unavailable');
});

test('corrupt primary recovers a valid snapshot and preserves corrupt raw data', () => {
  const valid = JSON.stringify(createEmptyState());
  const adapter = fakeStorage({ [STORAGE_KEY]: '{bad', [SNAPSHOT_KEY]: valid });
  const result = createStorage(adapter).load();
  assert.equal(result.status, 'recovered-snapshot');
  assert.equal(result.corruptRaw, '{bad');
  assert.equal(result.state.schemaVersion, 1);

  const broken = fakeStorage({ [STORAGE_KEY]: '{bad', [SNAPSHOT_KEY]: '{also bad' });
  const brokenResult = createStorage(broken).load();
  assert.equal(brokenResult.status, 'corrupt');
  assert.equal(brokenResult.raw, '{bad');
  assert.equal(brokenResult.snapshotRaw, '{also bad');
});
