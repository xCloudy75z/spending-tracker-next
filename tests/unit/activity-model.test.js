import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityModel } from '../../site/app/src/ui/activity.js';
import { createEmptyState } from '../../site/app/src/domain/model.js';

function activityState() {
  const state = createEmptyState();
  state.categories.food = { id: 'food', name: 'Café & Food', isArchived: false, order: 0 };
  state.categories.travel = { id: 'travel', name: 'Travel', isArchived: false, order: 1 };
  state.cycles.old = { id: 'old', startDate: '2026-08-01', endDate: '2026-08-31', startBudget: 1000 };
  state.cycles.now = { id: 'now', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 2000 };
  state.settings.activeCycleId = 'now';
  state.transactions = {
    old: { id: 'old', cycleId: 'old', categoryId: 'food', date: '2026-08-10', amount: 400, note: 'Old café', isRefund: false, isCredit: false, byWife: false },
    lunch: { id: 'lunch', cycleId: 'now', categoryId: 'food', date: '2026-09-20', amount: 50, note: 'CAFÉ lunch', isRefund: false, isCredit: true, byWife: false },
    refund: { id: 'refund', cycleId: 'now', categoryId: 'travel', date: '2026-09-19', amount: 10, note: 'Taxi', isRefund: true, isCredit: false, byWife: true },
  };
  return state;
}

test('Activity search is accent- and case-insensitive', () => {
  const model = createActivityModel(activityState(), { search: 'cafe' });
  assert.deepEqual(model.items.map(item => item.id), ['lunch', 'old']);
});

test('Activity combines type, category, and cycle filters', () => {
  const model = createActivityModel(activityState(), { type: 'card', categoryId: 'food', cycleId: 'now' });
  assert.deepEqual(model.items.map(item => item.id), ['lunch']);
  assert.equal(model.resultCount, 1);
  assert.equal(model.hasActiveFilters, true);
});

test('archived cycle totals stay separate from the active cycle total', () => {
  const model = createActivityModel(activityState(), {});
  assert.equal(model.currentCycleTotal, 40);
  assert.deepEqual(model.history.map(cycle => ({ id: cycle.id, spent: cycle.spent })), [{ id: 'old', spent: 400 }]);
});

