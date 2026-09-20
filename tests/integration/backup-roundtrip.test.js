import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectBackup, serializeBackup } from '../../site/app/src/domain/backup.js';

const originalText = await readFile(new URL('../fixtures/original-v1.json', import.meta.url), 'utf8');
const options = {
  nowISO: '2026-09-20T12:00:00.000+04:00',
  idFactory: prefix => prefix + '-generated',
};

test('new backup serialization round-trips the migrated original state', () => {
  const migrated = inspectBackup(originalText, options).candidate;
  const serialized = serializeBackup(migrated, { exportedAt: options.nowISO });
  const restored = inspectBackup(serialized, options);
  assert.equal(restored.sourceVersion, 'spending-tracker-next-v1');
  assert.deepEqual(restored.candidate, migrated);
});
