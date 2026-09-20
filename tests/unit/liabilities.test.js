import test from 'node:test';
import assert from 'node:assert/strict';
import { bankSummary, wifeSummary } from '../../site/app/src/domain/liabilities.js';
import { createEmptyState } from '../../site/app/src/domain/model.js';

function ledgerState() {
  const state = createEmptyState();
  state.transactions = {
    bank: {
      id: 'bank', date: '2026-09-01', amount: 180, isRefund: false,
      isCredit: true, liabilitySettled: false, byWife: false, wifeSettled: false,
    },
    wife: {
      id: 'wife', date: '2026-09-02', amount: 120, isRefund: false,
      isCredit: true, liabilitySettled: false, byWife: true, wifeSettled: false,
    },
    paid: {
      id: 'paid', date: '2026-09-03', amount: 50, isRefund: false,
      isCredit: true, liabilitySettled: true, byWife: false, wifeSettled: false,
    },
  };
  return state;
}

test('bank and wife summaries remain independent', () => {
  const state = ledgerState();
  assert.equal(bankSummary(state).outstanding, 300);
  assert.equal(wifeSummary(state).balance, 120);
});

test('wife refunds, settlements, and payments reduce only wife balance', () => {
  const state = ledgerState();
  state.transactions.refund = {
    id: 'refund', date: '2026-09-04', amount: 20, isRefund: true,
    isCredit: true, liabilitySettled: false, byWife: true, wifeSettled: false,
  };
  state.transactions.wife.wifeSettled = true;
  state.wifePayments.payment = { id: 'payment', date: '2026-09-05', amount: 10 };
  assert.equal(wifeSummary(state).balance, -30);
  assert.equal(bankSummary(state).outstanding, 280);
});
