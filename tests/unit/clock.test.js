import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock, didLocalDayChange } from '../../site/app/src/platform/clock.js';

test('a resumed page detects a changed local day', () => {
  assert.equal(didLocalDayChange('2026-09-20', '2026-09-21'), true);
  assert.equal(didLocalDayChange('2026-09-20', '2026-09-20'), false);
});

test('clock formats the injected instant as a local ISO date', () => {
  const clock = createClock(() => new Date(2026, 8, 20, 23, 59, 0));
  assert.equal(clock.todayISO(), '2026-09-20');
});
