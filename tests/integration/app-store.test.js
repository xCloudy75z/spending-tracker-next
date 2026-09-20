import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppStore } from '../../site/app/src/app-store.js';
import { createEmptyState } from '../../site/app/src/domain/model.js';

function readyState() {
  const state = createEmptyState();
  state.categories.food = {
    id: 'food', name: 'Food', icon: 'x', color: '#112233', order: 0,
    isArchived: false, budget: 0, budgetPeriod: 'monthly',
  };
  state.cycles.c1 = { id: 'c1', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000 };
  state.settings.activeCycleId = 'c1';
  return state;
}

test('dispatch persists once and notifies only after a successful save', () => {
  let saves = 0;
  let notifications = 0;
  const persist = { save() { saves += 1; } };
  const store = createAppStore({
    initialState: readyState(),
    persist,
    context: { idFactory: () => 't1', nowISO: '2026-09-20T12:00:00.000+04:00' },
  });
  store.subscribe(() => { notifications += 1; });
  store.dispatch({
    type: 'transaction/add',
    submissionId: 'submit-1',
    payload: { date: '2026-09-20', categoryId: 'food', amount: 10 },
  });
  assert.equal(saves, 1);
  assert.equal(notifications, 1);
  assert.equal(store.getState().transactions.t1.amount, 10);
});

test('failed persistence and re-entrant dispatch leave state unchanged', () => {
  const initialState = readyState();
  const failing = createAppStore({
    initialState,
    persist: { save() { throw new Error('disk failed'); } },
    context: { idFactory: () => 't1', nowISO: '2026-09-20T12:00:00.000+04:00' },
  });
  assert.throws(() => failing.dispatch({
    type: 'transaction/add',
    payload: { date: '2026-09-20', categoryId: 'food', amount: 10 },
  }), /disk failed/);
  assert.deepEqual(failing.getState(), initialState);

  const reentrant = createAppStore({
    initialState,
    persist: { save() {} },
    context: { idFactory: prefix => prefix + '-1', nowISO: '2026-09-20T12:00:00.000+04:00' },
  });
  let nestedError;
  reentrant.subscribe(() => {
    try {
      reentrant.dispatch({ type: 'settings/wifeTracking', payload: { enabled: false } });
    } catch (error) {
      nestedError = error;
    }
  });
  reentrant.dispatch({ type: 'settings/wifeTracking', payload: { enabled: true } });
  assert.equal(nestedError.code, 'REENTRANT_DISPATCH');
});

test('duplicate submission IDs are rejected for ten seconds', () => {
  let now = 1_000;
  let sequence = 0;
  const store = createAppStore({
    initialState: readyState(),
    persist: { save() {} },
    nowMs: () => now,
    context: { idFactory: () => 't' + (++sequence), nowISO: '2026-09-20T12:00:00.000+04:00' },
  });
  const command = {
    type: 'transaction/add',
    submissionId: 'same-submit',
    payload: { date: '2026-09-20', categoryId: 'food', amount: 10 },
  };
  store.dispatch(command);
  assert.throws(() => store.dispatch(command), error => error.code === 'DUPLICATE_SUBMISSION');
  now += 10_001;
  store.dispatch(command);
  assert.equal(Object.keys(store.getState().transactions).length, 2);
});

test('referenced category archival is atomic and requires reassignment', () => {
  const initial = readyState();
  initial.categories.travel = {
    id: 'travel', name: 'Travel', icon: 'x', color: '#445566', order: 1,
    isArchived: false, budget: 0, budgetPeriod: 'monthly',
  };
  initial.transactions.t1 = {
    id: 't1', cycleId: 'c1', categoryId: 'food', date: '2026-09-20', amount: 10,
    note: '', isRefund: false, isExcludedFromPace: false, isCredit: false,
    liabilitySettled: false, byWife: false, wifeSettled: false,
  };
  const store = createAppStore({ initialState: initial, persist: { save() {} } });
  assert.throws(
    () => store.dispatch({ type: 'category/archive', payload: { id: 'food', reassignTo: null } }),
    error => error.code === 'CATEGORY_IN_USE',
  );
  assert.equal(store.getState().categories.food.isArchived, false);
  assert.equal(store.getState().transactions.t1.categoryId, 'food');
  store.dispatch({ type: 'category/archive', payload: { id: 'food', reassignTo: 'travel' } });
  assert.equal(store.getState().categories.food.isArchived, true);
  assert.equal(store.getState().transactions.t1.categoryId, 'travel');
});

test('bank and wife settlement commands update only their own flags', () => {
  const initial = readyState();
  initial.transactions.wife = {
    id: 'wife', cycleId: 'c1', categoryId: 'food', date: '2026-09-20', amount: 40,
    note: '', isRefund: false, isExcludedFromPace: true, exclusionSource: 'wife',
    isCredit: true, creditSource: 'wife', liabilitySettled: false, settledAt: null,
    byWife: true, wifeSettled: false, wifeSettledAt: null,
  };
  const store = createAppStore({ initialState: initial, persist: { save() {} }, context: { nowISO: '2026-09-20T12:00:00Z' } });
  store.dispatch({ type: 'wife/settle', payload: { id: 'wife', settled: true } });
  assert.equal(store.getState().transactions.wife.wifeSettled, true);
  assert.equal(store.getState().transactions.wife.liabilitySettled, false);
  store.dispatch({ type: 'card/settle', payload: { id: 'wife', settled: true } });
  assert.equal(store.getState().transactions.wife.wifeSettled, true);
  assert.equal(store.getState().transactions.wife.liabilitySettled, true);
});
