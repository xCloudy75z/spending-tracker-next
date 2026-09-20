import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanModel } from '../../site/app/src/ui/plan.js';
import { createCardModel } from '../../site/app/src/ui/card.js';
import { createEmptyState } from '../../site/app/src/domain/model.js';

test('Plan exposes a recoverable first-run path when cycle or categories are missing', () => {
  const model = createPlanModel(createEmptyState(), '2026-09-20');
  assert.equal(model.setupRequired, true);
  assert.equal(model.needsCycle, true);
  assert.equal(model.needsCategory, true);
  assert.equal(model.primaryAction, 'setup');
});

test('Plan derives category use and keeps unallocated allowance visible', () => {
  const state = createEmptyState();
  state.categories.food = { id: 'food', name: 'Food', budget: 600, order: 0, isArchived: false };
  state.categories.travel = { id: 'travel', name: 'Travel', budget: 300, order: 1, isArchived: false };
  state.cycles.c1 = { id: 'c1', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1200 };
  state.settings.activeCycleId = 'c1';
  state.transactions.t1 = { id: 't1', cycleId: 'c1', categoryId: 'food', amount: 100, isRefund: false };
  const model = createPlanModel(state, '2026-09-20');
  assert.equal(model.unallocated, 300);
  assert.equal(model.categories.find(item => item.id === 'food').spent, 100);
  assert.equal(model.categories.find(item => item.id === 'food').isReferenced, true);
});

test('Card keeps bank obligations and wife reimbursements independent', () => {
  const state = createEmptyState();
  state.transactions.bank = { id: 'bank', date: '2026-09-20', amount: 80, isRefund: false, isCredit: true, liabilitySettled: false, byWife: false, wifeSettled: false };
  state.transactions.wife = { id: 'wife', date: '2026-09-20', amount: 30, isRefund: false, isCredit: true, liabilitySettled: false, byWife: true, wifeSettled: false };
  const model = createCardModel(state);
  assert.equal(model.bank.headingKey, 'card.bankOwed');
  assert.equal(model.wife.headingKey, 'card.wifeOwed');
  assert.equal(model.bank.outstanding, 110);
  assert.equal(model.wife.balance, 30);
});

