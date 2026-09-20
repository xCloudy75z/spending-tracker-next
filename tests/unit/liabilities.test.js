import test from 'node:test';
import assert from 'node:assert/strict';
import { addWifePayment, bankSummary, settleWifeTransaction, wifeSummary } from '../../site/app/src/domain/liabilities.js';
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
  assert.equal(wifeSummary(state).balance, 0);
  assert.equal(bankSummary(state).outstanding, 280);
});

test('wife payments and item settlement cannot double-count reimbursement', () => {
  const state = ledgerState();
  assert.throws(
    () => addWifePayment(state, { amount: 121, date: '2026-09-20' }),
    error => error.code === 'WIFE_PAYMENT_EXCEEDS_BALANCE',
  );
  const partiallyPaid = addWifePayment(state, { id: 'partial', amount: 40, date: '2026-09-20' });
  assert.equal(wifeSummary(partiallyPaid).balance, 80);
  assert.throws(
    () => settleWifeTransaction(partiallyPaid, 'wife', true),
    error => error.code === 'WIFE_SETTLEMENT_EXCEEDS_BALANCE',
  );
  const summary = wifeSummary(partiallyPaid);
  assert.equal(summary.unsettledPurchases[0].outstandingAmount, 80);
  assert.equal(summary.unsettledPurchases[0].paymentAllocated, 40);
  assert.equal(summary.unsettledPurchases[0].settlementDisabled, true);
});
