import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanModel, preferredCycleStart } from '../../site/app/src/ui/plan.js';
import { createCardModel } from '../../site/app/src/ui/card.js';
import { createEmptyState } from '../../site/app/src/domain/model.js';
import { updateSettings } from '../../site/app/src/domain/planning.js';

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

test('Plan derives the current cycle from today instead of a scheduled active id', () => {
  const state = createEmptyState();
  state.categories.food = { id: 'food', name: 'Food', icon: 'F', color: '#24766B', budget: 100, budgetPeriod: 'monthly', order: 0, isArchived: false };
  state.cycles.current = { id: 'current', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000 };
  state.cycles.future = { id: 'future', startDate: '2026-10-01', endDate: '2026-10-31', startBudget: 1200 };
  state.settings.activeCycleId = 'future';
  state.transactions.today = { id: 'today', cycleId: 'current', categoryId: 'food', date: '2026-09-20', amount: 25, isRefund: false };

  const model = createPlanModel(state, '2026-09-20');
  assert.equal(model.activeCycle.id, 'current');
  assert.equal(model.categories[0].spent, 25);
});

test('Plan settings and cycle savings treatment affect the spendable allowance', () => {
  const state = createEmptyState();
  const configured = updateSettings(state, { salaryDay: 12, savingsTreatment: 'deduct' });
  assert.equal(configured.settings.salaryDay, 12);
  assert.equal(configured.settings.savingsTreatment, 'deduct');
  configured.cycles.current = {
    id: 'current', startDate: '2026-09-01', endDate: '2026-09-30',
    startBudget: 2500, savingsTarget: 400, savingsTreatment: 'deduct',
  };
  configured.settings.activeCycleId = 'current';
  const model = createPlanModel(configured, '2026-09-20');
  assert.equal(model.spendableAllowance, 2100);
  assert.equal(model.unallocated, 2100);
  assert.equal(preferredCycleStart('2026-09-20', 12), '2026-09-12');
  assert.equal(preferredCycleStart('2026-09-05', 12), '2026-08-12');
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
