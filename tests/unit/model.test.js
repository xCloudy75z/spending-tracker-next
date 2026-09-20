import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState, validateState } from '../../site/app/src/domain/model.js';
import { stateWithCycle } from '../helpers/fixtures.js';

test('createEmptyState returns a valid isolated canonical state', () => {
  const first = createEmptyState();
  const second = createEmptyState();
  first.settings.locale = 'ar';
  assert.equal(second.settings.locale, 'en');
  assert.deepEqual(validateState(second), { ok: true, issues: [] });
});

test('validateState reports duplicate category names and overlapping cycles', () => {
  const state = stateWithCycle();
  state.categories = {
    one: { id: 'one', name: 'Food', icon: 'x', color: '#112233', order: 0, isArchived: false, budget: 0, budgetPeriod: 'monthly' },
    two: { id: 'two', name: ' food ', icon: 'y', color: '#445566', order: 1, isArchived: false, budget: 0, budgetPeriod: 'monthly' },
  };
  state.cycles.c2 = { id: 'c2', startDate: '2026-09-15', endDate: '2026-10-15', startBudget: 500 };
  const result = validateState(state);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.path === 'categories.two.name'));
  assert.ok(result.issues.some(issue => issue.path === 'cycles.c2.startDate'));
});
