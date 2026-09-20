import test from 'node:test';
import assert from 'node:assert/strict';
import { createTodayViewModel } from '../../site/app/src/ui/today.js';
import { stateWithCycle } from '../helpers/fixtures.js';

function populatedState() {
  const state = stateWithCycle({ startBudget: 300, endDate: '2026-09-30' });
  state.transactions = {
    old: {
      id: 'old', cycleId: 'c1', categoryId: 'food', date: '2026-09-18', amount: 250,
      note: '<img src=x onerror=alert(1)>', isRefund: false, isExcludedFromPace: false,
    },
    today: {
      id: 'today', cycleId: 'c1', categoryId: 'food', date: '2026-09-20', amount: 100,
      note: 'Lunch', isRefund: false, isExcludedFromPace: false,
    },
  };
  return state;
}

test('Today model leads with safe-to-spend and exposes one pace state', () => {
  const model = createTodayViewModel(populatedState(), '2026-09-20', { locale: 'en' });
  assert.equal(model.hero.labelKey, 'today.safeToSpend');
  assert.ok(model.hero.amount < 0, 'overspend remains visible as a negative amount');
  assert.deepEqual(Object.keys(model.pace).sort(), ['detailKey', 'state']);
  assert.equal(model.pace.state, 'over');
});

test('Today model keeps only the five newest transactions and preserves notes as plain strings', () => {
  const state = populatedState();
  for (let index = 0; index < 6; index += 1) {
    state.transactions['extra-' + index] = {
      id: 'extra-' + index, cycleId: 'c1', categoryId: 'food', date: `2026-09-${String(10 + index).padStart(2, '0')}`,
      amount: index + 1, note: 'Extra ' + index, isRefund: false, isExcludedFromPace: false,
    };
  }
  const model = createTodayViewModel(state, '2026-09-20', { locale: 'en' });
  assert.equal(model.recent.length, 5);
  assert.equal(typeof model.recent[0].note, 'string');
  const malicious = createTodayViewModel(populatedState(), '2026-09-20', { locale: 'en' })
    .recent.find(item => item.id === 'old');
  assert.equal(malicious.note, '<img src=x onerror=alert(1)>');
});

test('Today model offers Plan when no cycle exists and warns after fourteen days without backup', () => {
  const state = stateWithCycle({ startDate: '2026-10-01', endDate: '2026-10-31' });
  const model = createTodayViewModel(state, '2026-09-20', {
    locale: 'en',
    lastBackupAt: '2026-09-05T12:00:00.000Z',
  });
  assert.equal(model.hasCycle, false);
  assert.equal(model.emptyActionRoute, 'plan');
  assert.equal(model.backupWarning, true);
});

