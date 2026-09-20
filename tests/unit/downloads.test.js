import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadCsv, downloadJsonBackup } from '../../site/app/src/platform/downloads.js';
import { createEmptyState } from '../../site/app/src/domain/model.js';

function harness() {
  const blobs = [];
  const calls = [];
  const revoked = [];
  class FakeBlob {
    constructor(parts, options) { this.parts = parts; this.type = options.type; blobs.push(this); }
  }
  return {
    blobs, calls, revoked, FakeBlob,
    url: { createObjectURL: () => 'blob:test', revokeObjectURL: value => revoked.push(value) },
    trigger: (url, filename) => calls.push({ url, filename }),
  };
}

test('JSON backup uses deterministic filename, MIME, trigger, and URL revocation', () => {
  const h = harness();
  const result = downloadJsonBackup(createEmptyState(), '2026-09-20', { Blob: h.FakeBlob, URL: h.url, trigger: h.trigger, exportedAt: '2026-09-20T12:00:00Z' });
  assert.equal(result.filename, 'spending-tracker-next-backup-2026-09-20.json');
  assert.equal(h.blobs[0].type, 'application/json');
  assert.deepEqual(h.calls, [{ url: 'blob:test', filename: result.filename }]);
  assert.deepEqual(h.revoked, ['blob:test']);
});

test('CSV uses UTF-8 MIME and deterministic filename', () => {
  const h = harness();
  const result = downloadCsv(createEmptyState(), '2026-09-20', { Blob: h.FakeBlob, URL: h.url, trigger: h.trigger });
  assert.equal(result.filename, 'spending-tracker-next-transactions-2026-09-20.csv');
  assert.equal(h.blobs[0].type, 'text/csv;charset=utf-8');
  assert.deepEqual(h.revoked, ['blob:test']);
});

