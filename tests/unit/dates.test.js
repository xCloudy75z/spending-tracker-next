import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysInclusive } from '../../site/app/src/domain/dates.js';

test('date arithmetic crosses leap day using local calendar values', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-02-29', 1), '2028-03-01');
  assert.equal(daysInclusive('2028-02-28', '2028-03-01'), 3);
});

test('date arithmetic rejects impossible ISO dates', () => {
  assert.throws(() => addDays('2026-02-29', 1), /invalid ISO date/);
  assert.throws(() => daysInclusive('2026-09-02', '2026-09-01'), /before start/);
});

test('date arithmetic is unaffected by daylight-saving boundary dates', () => {
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-10-25', 1), '2026-10-26');
});
