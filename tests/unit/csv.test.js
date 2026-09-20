import test from 'node:test';
import assert from 'node:assert/strict';
import { exportTransactionsCsv } from '../../site/app/src/domain/csv.js';
import { createEmptyState } from '../../site/app/src/domain/model.js';

function csvStateWithNotes(note) {
  const state = createEmptyState();
  state.categories.food = {
    id: 'food', name: '+Unsafe category', icon: 'x', color: '#112233', order: 0,
    isArchived: false, budget: 0, budgetPeriod: 'monthly',
  };
  state.cycles.september = {
    id: 'september', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000,
  };
  state.transactions.second = {
    id: 'second', cycleId: 'september', categoryId: 'food', date: '2026-09-02', amount: 20,
    isRefund: false, isCredit: true, liabilitySettled: false, byWife: false, note,
  };
  state.transactions.first = {
    id: 'first', cycleId: 'september', categoryId: 'food', date: '2026-09-01', amount: 10,
    isRefund: true, isCredit: false, liabilitySettled: false, byWife: false, note: '  @command',
  };
  return state;
}

test('CSV neutralizes spreadsheet formulas in every text column', () => {
  const csv = exportTransactionsCsv(csvStateWithNotes('=HYPERLINK("https://bad")'));
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"'\+Unsafe category"/);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/bad""\)"/);
  assert.match(csv, /"'  @command"/);
  assert.doesNotMatch(csv, /,"=HYPERLINK/);
});

test('CSV has deterministic columns and transaction order', () => {
  const csv = exportTransactionsCsv(csvStateWithNotes('safe'));
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines[0], '"Date","Type","Amount","Category","Note","Payment method","Wife reimbursement","Liability status","Cycle"');
  assert.match(lines[1], /^"2026-09-01","Refund","-10\.00"/);
  assert.match(lines[2], /^"2026-09-02","Expense","20\.00"/);
});

test('CSV preserves distinct expense, income, and refund semantics', () => {
  const state = csvStateWithNotes('safe');
  state.transactions.first.kind = 'refund';
  state.transactions.income = { ...state.transactions.first, id: 'income', date: '2026-09-03', kind: 'income', amount: 100 };
  const csv = exportTransactionsCsv(state);
  assert.match(csv, /"2026-09-01","Refund","-10\.00"/);
  assert.match(csv, /"2026-09-02","Expense","20\.00"/);
  assert.match(csv, /"2026-09-03","Income","-100\.00"/);
});
