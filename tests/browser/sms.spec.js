import { test, expect } from '@playwright/test';

const APPROVED = 'Trx. of AED40.00 on your card ending *1 at TEST SHOP, UAE is Approved. Trx Date: 31/08/26 19:30';
const DECLINED = 'Trx. of AED12.50 on your card ending *1 at TEST CAFE, UAE is Declined. Trx Date: 30/08/26 09:15';

function state() {
  return {
    schemaVersion: 1,
    settings: { currency: 'AED', salaryDay: 25, theme: 'system', activeCycleId: 'sep', locale: 'en', lastUsedCategoryId: 'food', localTimestamps: true, wifeTracking: true },
    categories: { food: { id: 'food', name: 'Food', icon: 'F', color: '#24766B', order: 0, isArchived: false, budget: 500, budgetPeriod: 'monthly' } },
    cycles: {
      aug: { id: 'aug', startDate: '2026-08-01', endDate: '2026-08-31', startBudget: 1000 },
      sep: { id: 'sep', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000 },
    },
    transactions: {}, wifePayments: {},
  };
}

test('SMS review separates duplicate, declined, and unknown rows before atomic backdated import', async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(value)), state());
  await page.goto('app/');
  await page.locator('[data-save-state]').click();
  await page.locator('[data-open-sms]').click();
  await page.locator('#sms-input').fill([APPROVED, DECLINED, APPROVED, 'unknown message'].join('\n'));
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.locator('[data-sms-status="recognized"]')).toHaveCount(1);
  await expect(page.locator('[data-sms-status="duplicate"]')).toHaveCount(1);
  await expect(page.locator('[data-sms-status="declined"]')).toHaveCount(1);
  await expect(page.locator('[data-sms-status="unrecognized"]')).toHaveCount(1);
  await page.locator('#sms-wife').check();
  await page.locator('[data-sms-import]').click();
  await expect(page.locator('[data-live-region]')).toContainText('Imported 1; skipped 3.');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(Object.values(stored.transactions)).toHaveLength(1);
  expect(Object.values(stored.transactions)[0]).toMatchObject({ cycleId: 'aug', byWife: true, isCredit: true });
});

