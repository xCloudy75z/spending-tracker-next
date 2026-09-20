import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../../site/app/src/domain/model.js';
import {
  addTransaction,
  deleteTransaction,
  reassignCategory,
  setWifeTracking,
  updateTransaction,
} from '../../site/app/src/domain/transactions.js';

function twoCycleState() {
  const state = createEmptyState();
  state.categories.food = {
    id: 'food', name: 'Food', icon: 'x', color: '#112233', order: 0,
    isArchived: false, budget: 0, budgetPeriod: 'monthly',
  };
  state.categories.other = {
    id: 'other', name: 'Other', icon: 'y', color: '#445566', order: 1,
    isArchived: false, budget: 0, budgetPeriod: 'monthly',
  };
  state.cycles.august = { id: 'august', startDate: '2026-08-01', endDate: '2026-08-31', startBudget: 1000 };
  state.cycles.september = { id: 'september', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000 };
  state.settings.activeCycleId = 'september';
  return state;
}

const fixedContext = {
  idFactory: () => 't1',
  nowISO: '2026-09-20T12:00:00.000+04:00',
};

test('backdated transaction is assigned to its containing cycle without mutating state', () => {
  const original = twoCycleState();
  const next = addTransaction(original, {
    date: '2026-08-31', categoryId: 'food', amount: 40, note: 'Backdated',
  }, fixedContext);
  assert.equal(next.transactions.t1.cycleId, 'august');
  assert.equal(Object.keys(original.transactions).length, 0);
});

test('transaction outside every cycle is refused with a typed error', () => {
  assert.throws(
    () => addTransaction(twoCycleState(), { date: '2026-10-01', categoryId: 'food', amount: 10 }, fixedContext),
    error => error.code === 'DATE_OUTSIDE_CYCLES',
  );
});

test('turning wife tracking off normalizes stale flags but preserves explicit card use', () => {
  const state = twoCycleState();
  state.transactions.wifeOnly = {
    id: 'wifeOnly', cycleId: 'september', categoryId: 'food', date: '2026-09-10', amount: 30,
    isRefund: false, isExcludedFromPace: true, exclusionSource: 'wife', isCredit: true,
    creditSource: 'wife', liabilitySettled: false, byWife: true, wifeSettled: true,
    wifeSettledAt: '2026-09-11T10:00:00.000+04:00', note: '',
  };
  state.transactions.cardAndWife = {
    ...state.transactions.wifeOnly, id: 'cardAndWife', amount: 50, creditSource: 'explicit',
  };
  const next = setWifeTracking(state, false);
  assert.equal(next.settings.wifeTracking, false);
  assert.equal(next.transactions.wifeOnly.byWife, false);
  assert.equal(next.transactions.wifeOnly.isExcludedFromPace, false);
  assert.equal(next.transactions.wifeOnly.isCredit, false);
  assert.equal(next.transactions.cardAndWife.isCredit, true);
  assert.equal(state.transactions.wifeOnly.byWife, true);
});

test('update, reassignment, and deletion preserve immutability', () => {
  const added = addTransaction(twoCycleState(), {
    date: '2026-09-10', categoryId: 'food', amount: 25,
  }, fixedContext);
  const updated = updateTransaction(added, 't1', { date: '2026-08-20', amount: 30 }, fixedContext);
  assert.equal(updated.transactions.t1.cycleId, 'august');
  assert.equal(added.transactions.t1.amount, 25);
  const reassigned = reassignCategory(updated, 'food', 'other');
  assert.equal(reassigned.transactions.t1.categoryId, 'other');
  const deleted = deleteTransaction(reassigned, 't1');
  assert.equal(deleted.transactions.t1, undefined);
  assert.ok(reassigned.transactions.t1);
});
