import { test, expect } from '@playwright/test';

function state() {
  return {
    schemaVersion: 1,
    settings: {
      currency: 'AED', salaryDay: 25, theme: 'system', activeCycleId: 'sep',
      locale: 'en', lastUsedCategoryId: 'food', localTimestamps: true, wifeTracking: true,
    },
    categories: {
      food: { id: 'food', name: 'Food', icon: 'F', color: '#24766B', order: 0, isArchived: false, budget: 900, budgetPeriod: 'monthly' },
      travel: { id: 'travel', name: 'Travel', icon: 'T', color: '#A46616', order: 1, isArchived: false, budget: 500, budgetPeriod: 'monthly' },
    },
    cycles: {
      aug: { id: 'aug', startDate: '2026-08-01', endDate: '2026-08-31', startBudget: 2000 },
      sep: { id: 'sep', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 3000 },
    },
    transactions: {}, wifePayments: {},
  };
}

async function seed(page) {
  await page.addInitScript(value => localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(value)), state());
  await page.goto('/app/');
}

test('transaction creation is keyboard usable and a rapid double submit creates one record', async ({ page }) => {
  await seed(page);
  await page.locator('[data-add-transaction]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog[open]')).toBeVisible();
  await expect(page.locator('#transaction-amount')).toBeFocused();
  await page.keyboard.type('42.75');
  await page.locator('#transaction-category').selectOption('travel');
  await page.locator('#transaction-more').click();
  await page.locator('#transaction-note').fill('Airport lunch');
  const save = page.locator('[data-transaction-save]');
  await expect(save).toBeEnabled();
  await save.evaluate(button => { button.click(); button.click(); });
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(Object.values(stored.transactions)).toHaveLength(1);
  expect(Object.values(stored.transactions)[0]).toMatchObject({ amount: 42.75, categoryId: 'travel', note: 'Airport lunch' });
});

test('backdating routes to the matching cycle and future dates outside cycles are refused', async ({ page }) => {
  await seed(page);
  await page.locator('[data-add-transaction]').click();
  await page.locator('#transaction-amount').fill('10');
  await page.locator('#transaction-category').selectOption('food');
  await page.locator('#transaction-more').click();
  await page.locator('#transaction-date').fill('2026-08-20');
  await page.locator('[data-transaction-save]').click();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(Object.values(stored.transactions)[0].cycleId).toBe('aug');

  await page.locator('[data-add-transaction]').click();
  await page.locator('#transaction-amount').fill('20');
  await page.locator('#transaction-category').selectOption('food');
  await page.locator('#transaction-more').click();
  await page.locator('#transaction-date').fill('2030-01-01');
  await expect(page.locator('[data-outside-cycle]')).toBeVisible();
  await expect(page.locator('[data-transaction-save]')).toBeDisabled();
  await expect(page.locator('[data-outside-cycle] a')).toHaveAttribute('href', '#/plan');
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(Object.values(stored.transactions)).toHaveLength(1);
});

test('cancel preserves state; create supports wife and explicit card flags', async ({ page }) => {
  await seed(page);
  await page.locator('[data-add-transaction]').click();
  await page.locator('#transaction-amount').fill('12');
  await page.getByRole('button', { name: 'Cancel' }).click();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(Object.values(stored.transactions)).toHaveLength(0);

  await page.locator('[data-add-transaction]').click();
  await page.locator('#transaction-amount').fill('125');
  await page.locator('#transaction-category').selectOption('food');
  await page.locator('#transaction-more').click();
  await page.locator('#transaction-card').check();
  await page.locator('#transaction-wife').check();
  await page.locator('[data-transaction-save]').click();
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(Object.values(stored.transactions)[0]).toMatchObject({
    isCredit: true, creditSource: 'explicit', byWife: true, isExcludedFromPace: true,
  });
});

test('editing changes amount, category, and date while enforcing the 500-character note limit', async ({ page }) => {
  await seed(page);
  await page.locator('[data-add-transaction]').click();
  await page.locator('#transaction-amount').fill('15');
  await page.locator('#transaction-category').selectOption('food');
  await page.locator('[data-transaction-save]').click();
  await page.locator('[data-transaction-id]').click();
  await page.locator('#transaction-amount').fill('22.5');
  await page.locator('#transaction-category').selectOption('travel');
  await page.locator('#transaction-more').click();
  await page.locator('#transaction-date').fill('2026-08-21');
  await expect(page.locator('#transaction-note')).toHaveAttribute('maxlength', '500');
  await page.locator('#transaction-note').fill('x'.repeat(500));
  await page.locator('[data-transaction-save]').click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(Object.values(stored.transactions)[0]).toMatchObject({ amount: 22.5, categoryId: 'travel', date: '2026-08-21', cycleId: 'aug' });
  expect(Object.values(stored.transactions)[0].note).toHaveLength(500);
});

