import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  inspectBackup,
  migrateOriginalV1,
  MAX_BACKUP_BYTES,
} from '../../site/app/src/domain/backup.js';

const originalText = await readFile(new URL('../fixtures/original-v1.json', import.meta.url), 'utf8');
const maliciousText = await readFile(new URL('../fixtures/malicious-v1.json', import.meta.url), 'utf8');
const fixedOptions = {
  nowISO: '2026-09-20T12:00:00.000+04:00',
  idFactory: prefix => prefix + '-generated',
};

function sumSigned(state) {
  return Object.values(state.transactions).reduce(
    (sum, transaction) => sum + (transaction.isRefund ? -transaction.amount : transaction.amount),
    0,
  );
}

test('original V1 backup migrates without changing financial totals', () => {
  const source = JSON.parse(originalText);
  const preview = inspectBackup(originalText, fixedOptions);
  assert.equal(preview.sourceVersion, 'original-v1');
  assert.equal(preview.counts.transactions, 4);
  assert.equal(sumSigned(preview.candidate), sumSigned(source));
  assert.equal(preview.candidate.transactions['txn-wife'].isCredit, true);
  assert.equal(preview.candidate.transactions['txn-wife'].isExcludedFromPace, true);
});

test('invalid references and dangerous presentational fields never reach storage', () => {
  assert.throws(
    () => inspectBackup(maliciousText, fixedOptions),
    error => error.code === 'BACKUP_INVALID'
      && error.issues.some(issue => issue.path === 'transactions.bad.categoryId')
      && error.issues.some(issue => issue.path === 'categories.bad.color'),
  );
});

test('duplicate embedded IDs are rejected even when map keys differ', () => {
  const source = JSON.parse(originalText);
  source.categories['cat-copy'] = { ...source.categories['cat-food'] };
  assert.throws(() => inspectBackup(JSON.stringify(source), fixedOptions), /duplicate entity id/);
});

test('migration never mutates the source object', () => {
  const source = JSON.parse(originalText);
  const before = JSON.stringify(source);
  migrateOriginalV1(source, fixedOptions);
  assert.equal(JSON.stringify(source), before);
});

test('corrupt, truncated, and oversized backups are rejected before migration', () => {
  assert.throws(() => inspectBackup('{"schemaVersion":', fixedOptions), /not valid JSON/);
  assert.throws(() => inspectBackup(' '.repeat(MAX_BACKUP_BYTES + 1), fixedOptions), /5 MiB limit/);
});

test('prototype keys and excessive nesting are rejected', () => {
  assert.throws(
    () => inspectBackup('{"schemaVersion":1,"__proto__":{"polluted":true}}', fixedOptions),
    /forbidden object key/,
  );
  let nested = { value: true };
  for (let index = 0; index < 34; index += 1) nested = { nested };
  assert.throws(() => inspectBackup(JSON.stringify({ schemaVersion: 1, extra: nested }), fixedOptions), /32 levels/);
});

test('missing collections are normalized but null entities and unsafe values are rejected', () => {
  const minimal = inspectBackup(JSON.stringify({ schemaVersion: 1, settings: {} }), fixedOptions);
  assert.deepEqual(minimal.counts, { categories: 0, cycles: 0, transactions: 0, wifePayments: 0 });

  const source = JSON.parse(originalText);
  source.categories.broken = null;
  source.transactions['txn-expense'].note = 'bad\u0001note';
  source.transactions['txn-credit'].amount = 'NaN';
  assert.throws(() => inspectBackup(JSON.stringify(source), fixedOptions), error => (
    error.issues.some(issue => issue.path === 'categories.broken')
      && error.issues.some(issue => issue.path === 'transactions.txn-expense.note')
      && error.issues.some(issue => issue.path === 'transactions.txn-credit.amount')
  ));
});

test('unsupported top-level collections cannot be hidden by migration', () => {
  const source = JSON.parse(originalText);
  source.accounts = { hidden: true };
  assert.throws(() => inspectBackup(JSON.stringify(source), fixedOptions), /unsupported top-level collection/);
});

test('migration allowlists entity fields instead of retaining unknown metadata', () => {
  const source = JSON.parse(originalText);
  source.settings.privateDebug = 'remove me';
  source.categories['cat-food'].privateDebug = 'remove me';
  source.cycles['cycle-sep'].privateDebug = 'remove me';
  source.transactions['txn-expense'].privateDebug = 'remove me';
  source.wifePayments['wife-payment-1'].privateDebug = 'remove me';
  const preview = inspectBackup(JSON.stringify(source), fixedOptions);
  assert.equal(JSON.stringify(preview.candidate).includes('privateDebug'), false);
});
