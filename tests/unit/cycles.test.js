import test from 'node:test';
import assert from 'node:assert/strict';
import { cycleForDate, deriveToday } from '../../site/app/src/domain/cycles.js';
import { stateWithCycle, stateWithSpending } from '../helpers/fixtures.js';

test('cycleForDate includes both boundaries and rejects adjacent days', () => {
  const state = stateWithCycle({ id: 'c1', startDate: '2028-02-01', endDate: '2028-02-29' });
  assert.equal(cycleForDate(state, '2028-02-01').id, 'c1');
  assert.equal(cycleForDate(state, '2028-02-29').id, 'c1');
  assert.equal(cycleForDate(state, '2028-03-01'), null);
});

test('cycleForDate refuses ambiguous overlapping cycles', () => {
  const state = stateWithCycle({ id: 'c1', startDate: '2026-09-01', endDate: '2026-09-30' });
  state.cycles.c2 = { id: 'c2', startDate: '2026-09-15', endDate: '2026-10-14', startBudget: 1_000 };
  assert.throws(
    () => cycleForDate(state, '2026-09-20'),
    error => error.code === 'INVARIANT_OVERLAPPING_CYCLES',
  );
});

test('cycleForDate rejects an impossible cycle boundary', () => {
  const state = stateWithCycle({ startDate: '2026-02-01', endDate: '2026-02-30' });
  assert.throws(() => cycleForDate(state, '2026-02-20'), /invalid cycle boundary/);
});

test('deriveToday exposes one pace state and safe amount', () => {
  const model = deriveToday(stateWithSpending(), '2026-09-20');
  assert.deepEqual(Object.keys(model.pace).sort(), ['detailKey', 'state']);
  assert.equal(model.safeToSpend, 186.36);
  assert.equal(model.spentToday, 50);
  assert.equal(model.remainingBalance, 2_550);
});

test('deriveToday returns a calm empty model before a future cycle begins', () => {
  const model = deriveToday(stateWithCycle({ startDate: '2026-10-01', endDate: '2026-10-31' }), '2026-09-30');
  assert.equal(model.cycle, null);
  assert.equal(model.safeToSpend, 0);
  assert.equal(model.pace.state, 'insufficient-data');
});

test('deriveToday reports overspending as one canonical over state', () => {
  const state = stateWithCycle({ startBudget: 300 });
  state.transactions.t1 = {
    id: 't1', cycleId: 'c1', categoryId: 'food', date: '2026-09-20',
    amount: 350, isRefund: false, isExcludedFromPace: false,
  };
  const model = deriveToday(state, '2026-09-20');
  assert.equal(model.remainingBalance, -50);
  assert.equal(model.pace.state, 'over');
  assert.ok(model.safeToSpend < 0);
});

test('refunds increase and excluded purchases do not change safe-to-spend', () => {
  const state = stateWithCycle({ startBudget: 300 });
  state.transactions.refund = {
    id: 'refund', cycleId: 'c1', categoryId: 'food', date: '2026-09-19',
    amount: 100, isRefund: true, isExcludedFromPace: false,
  };
  state.transactions.wife = {
    id: 'wife', cycleId: 'c1', categoryId: 'food', date: '2026-09-20',
    amount: 200, isRefund: false, isExcludedFromPace: true,
  };
  const model = deriveToday(state, '2026-09-20');
  assert.equal(model.safeToSpend, 36.36);
  assert.equal(model.remainingBalance, 400);
});

test('deduct-first savings reduce the canonical Today budget', () => {
  const state = stateWithCycle({ startBudget: 3000, savingsTarget: 600, savingsTreatment: 'deduct' });
  const model = deriveToday(state, '2026-09-20');
  assert.equal(model.budget, 2400);
  assert.equal(model.remainingBalance, 2400);
  assert.equal(model.safeToSpend, 218.18);
});
