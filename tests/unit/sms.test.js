import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../../site/app/src/domain/model.js';
import { parseSms, prepareSmsTransactions } from '../../site/app/src/domain/sms.js';

const APPROVED = 'Trx. of AED40.00 on your card ending *1 at TEST SHOP, UAE is Approved. Trx Date: 31/08/26 19:30';
const DECLINED = 'Trx. of AED12.50 on your card ending *1 at TEST CAFE, UAE is Declined. Trx Date: 30/08/26 09:15';
const DEBIT = 'AED 1,250.00 was debited from your account for TEST TRANSFER';

function importState() {
  const state = createEmptyState();
  state.categories.food = {
    id: 'food', name: 'Food', icon: 'x', color: '#112233', order: 0,
    isArchived: false, budget: 0, budgetPeriod: 'monthly',
  };
  state.cycles.august = {
    id: 'august', startDate: '2026-08-01', endDate: '2026-08-31', startBudget: 1000,
    archivedAt: '2026-09-01T00:00:00.000+04:00',
  };
  state.cycles.september = {
    id: 'september', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000,
  };
  state.settings.activeCycleId = 'september';
  return state;
}

test('parser recognizes approved, declined, debit, duplicate, and unrecognized lines', () => {
  const result = parseSms([APPROVED, DECLINED, DEBIT, APPROVED, 'hello world'].join('\n'));
  assert.equal(result.rows.length, 4);
  assert.equal(result.rows[0].status, 'approved');
  assert.equal(result.rows[0].amount, 40);
  assert.equal(result.rows[0].dateISO, '2026-08-31');
  assert.equal(result.rows[1].status, 'declined');
  assert.equal(result.rows[2].kind, 'debit');
  assert.equal(result.rows[2].amount, 1250);
  assert.equal(result.rows[3].duplicateOf, 0);
  assert.deepEqual(result.unrecognized, ['hello world']);
});

test('parser keeps merchant commas and marks impossible transaction dates', () => {
  const comma = parseSms('Trx. of AED10.00 on your card ending *1 at TEST MARKET, DUBAI, UAE is Approved. Trx Date: 02/07/26 10:00').rows[0];
  assert.equal(comma.note, 'TEST MARKET, DUBAI');
  const invalid = parseSms('Trx. of AED10.00 on your card ending *1 at TEST SHOP, UAE is Approved. Trx Date: 31/02/26 10:00').rows[0];
  assert.equal(invalid.status, 'invalid-date');
});

test('preparation requires confirmation and a real category', () => {
  const parsed = parseSms(APPROVED);
  assert.throws(() => prepareSmsTransactions(importState(), parsed, { categoryId: 'food', confirm: false }), error => error.code === 'CONFIRM_REQUIRED');
  assert.throws(() => prepareSmsTransactions(importState(), parsed, { categoryId: 'missing', confirm: true }), error => error.code === 'CATEGORY_NOT_FOUND');
});

test('preparation skips declined and duplicate rows and routes to archived cycles', () => {
  const parsed = parseSms([APPROVED, DECLINED, APPROVED].join('\n'));
  let sequence = 0;
  const result = prepareSmsTransactions(importState(), parsed, {
    categoryId: 'food',
    confirm: true,
    context: {
      idFactory: () => 'sms-' + (++sequence),
      nowISO: '2026-09-20T12:00:00.000+04:00',
    },
  });
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].cycleId, 'august');
  assert.equal(result.transactions[0].isCredit, true);
  assert.deepEqual(result.skipped.map(item => item.reason).sort(), ['declined', 'duplicate']);
});
