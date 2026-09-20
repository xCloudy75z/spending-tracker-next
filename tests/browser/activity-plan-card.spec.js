import { test, expect } from '@playwright/test';

function emptyState() {
  return {
    schemaVersion: 1,
    settings: {
      currency: 'AED', salaryDay: 25, theme: 'system', activeCycleId: null,
      locale: 'en', lastUsedCategoryId: null, localTimestamps: true, wifeTracking: true,
    },
    categories: {}, cycles: {}, transactions: {}, wifePayments: {},
  };
}

function transaction(id, values = {}) {
  return {
    id, cycleId: 'sep', categoryId: 'food', date: '2026-09-20', amount: 10, note: id,
    isRefund: false, isExcludedFromPace: false, exclusionSource: null,
    isCredit: false, creditSource: null, liabilitySettled: false, settledAt: null,
    byWife: false, wifeSettled: false, wifeSettledAt: null,
    createdAt: '2026-09-20T10:00:00.000Z', updatedAt: '2026-09-20T10:00:00.000Z',
    ...values,
  };
}

function readyState() {
  const state = emptyState();
  state.settings.activeCycleId = 'sep';
  state.settings.lastUsedCategoryId = 'food';
  state.categories = {
    food: { id: 'food', name: 'Café Food', icon: 'F', color: '#24766B', order: 0, isArchived: false, budget: 700, budgetPeriod: 'monthly' },
    travel: { id: 'travel', name: 'Travel', icon: 'T', color: '#A46616', order: 1, isArchived: false, budget: 300, budgetPeriod: 'monthly' },
  };
  state.cycles = {
    aug: { id: 'aug', startDate: '2026-08-01', endDate: '2026-08-31', startBudget: 1800, archivedAt: '2026-09-01T00:00:00Z' },
    sep: { id: 'sep', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 2500, archivedAt: null },
  };
  state.transactions = {
    lunch: transaction('lunch', { note: 'CAFÉ lunch', amount: 40, isCredit: true, creditSource: 'explicit' }),
    taxi: transaction('taxi', { categoryId: 'travel', note: 'Taxi', amount: 25, date: '2026-09-19' }),
    wife: transaction('wife', { note: 'Wife shopping', amount: 75, isCredit: true, creditSource: 'wife', byWife: true, isExcludedFromPace: true, exclusionSource: 'wife' }),
    old: transaction('old', { cycleId: 'aug', date: '2026-08-10', amount: 100 }),
  };
  return state;
}

async function seed(page, state = readyState()) {
  await page.addInitScript(value => localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(value)), state);
  await page.goto('/app/');
}

test('Activity combines search and filters, preserves results after editing, and confirms deletion', async ({ page }) => {
  await seed(page);
  await page.locator('[data-route="activity"]').click();
  await page.getByLabel('Search').fill('cafe');
  await expect(page.locator('[data-result-count]')).toHaveText('3');
  await page.getByLabel('Type').selectOption('card');
  await page.getByLabel('Cycle dates').selectOption('sep');
  await expect(page.locator('[data-result-count]')).toHaveText('2');
  await page.locator('[data-activity-id="lunch"]').getByRole('button', { name: 'Edit' }).click();
  await page.locator('#transaction-amount').fill('44');
  await page.locator('[data-transaction-save]').click();
  await expect(page.getByLabel('Search')).toHaveValue('cafe');
  await expect(page.locator('[data-result-count]')).toHaveText('2');
  await page.locator('[data-activity-id="lunch"]').getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.locator('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('[data-activity-id="lunch"]')).toHaveCount(0);
});

test('Activity keeps search focus and accepts real sequential typing', async ({ page }) => {
  await seed(page);
  await page.locator('[data-route="activity"]').click();
  const search = page.getByLabel('Search');
  await search.pressSequentially('cafe', { delay: 40 });
  await page.waitForTimeout(250);
  await expect(page.getByLabel('Search')).toBeFocused();
  await expect(page.getByLabel('Search')).toHaveValue('cafe');
  await expect(page.locator('[data-result-count]')).toHaveText('3');
  await page.getByLabel('Search').pressSequentially(' lunch', { delay: 25 });
  await page.waitForTimeout(250);
  await expect(page.getByLabel('Search')).toBeFocused();
  await expect(page.getByLabel('Search')).toHaveValue('cafe lunch');
  await expect(page.locator('[data-result-count]')).toHaveText('1');
});

test('Plan recovers from zero categories and cycles, then creates both', async ({ page }) => {
  await seed(page, emptyState());
  await page.locator('[data-route="plan"]').click();
  await expect(page.locator('[data-cycle-setup]')).toBeVisible();
  await expect(page.locator('[data-category-add]')).toBeVisible();
  await page.locator('#setup-allowance').fill('3000');
  await page.locator('[data-cycle-setup]').getByRole('button', { name: 'Save' }).click();
  await page.locator('#category-name').fill('Food');
  await page.locator('#category-budget').fill('900');
  await page.locator('[data-category-add]').getByRole('button', { name: 'Add category' }).click();
  await expect(page.locator('[data-category-id]')).toContainText('Food');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(Object.keys(stored.cycles)).toHaveLength(1);
  expect(Object.keys(stored.categories)).toHaveLength(1);
});

test('Plan atomically reassigns a referenced category and rolls to a non-overlapping cycle', async ({ page }) => {
  await seed(page);
  await page.locator('[data-route="plan"]').click();
  await page.locator('[data-edit-category="travel"]').click();
  await page.locator('#edit-category-name').fill('Transit');
  await page.locator('#edit-category-budget').fill('350');
  await page.locator('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('[data-category-id="travel"]')).toContainText('Transit');
  await page.locator('[data-reassign-for="food"]').selectOption('travel');
  await page.locator('[data-archive-category="food"]').click();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(stored.categories.food.isArchived).toBe(true);
  expect(stored.transactions.lunch.categoryId).toBe('travel');
  expect(stored.transactions.old.categoryId).toBe('travel');
  await page.locator('.rollover summary').click();
  await page.locator('[data-rollover]').getByRole('button', { name: 'Start next cycle' }).click();
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(Object.keys(stored.cycles)).toHaveLength(3);
  expect(stored.settings.activeCycleId).toBe('sep');
  expect(stored.cycles.sep.archivedAt).toBeNull();
  await expect(page.locator('.cycle-summary')).toContainText('Sep');
});

test('Plan persists a reusable cycle-start day and savings treatment', async ({ page }) => {
  await seed(page);
  await page.locator('[data-route="plan"]').click();
  await page.locator('[data-setting-cycle-start]').fill('12');
  await page.locator('[data-setting-cycle-start]').blur();
  await page.locator('[data-setting-savings]').selectOption('deduct');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(stored.settings).toMatchObject({ salaryDay: 12, savingsTreatment: 'deduct' });

  await page.locator('.rollover summary').click();
  await page.locator('#rollover-savings').fill('200');
  await page.locator('[data-rollover]').getByRole('button', { name: 'Start next cycle' }).click();
  const updated = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  const future = Object.values(updated.cycles).find(cycle => cycle.id !== 'aug' && cycle.id !== 'sep');
  expect(future).toMatchObject({ savingsTarget: 200, savingsTreatment: 'deduct' });
});

test('Card allocates aggregate wife payments without leaving false full-balance actions', async ({ page }) => {
  const state = readyState();
  state.wifePayments.partial = { id: 'partial', amount: 25, date: '2026-09-20', note: '', createdAt: '2026-09-20T12:00:00Z' };
  await seed(page, state);
  await page.locator('[data-route="card"]').click();
  await expect(page.locator('[data-wife-total]')).toContainText('50');
  const row = page.locator('[data-ledger-kind="wife"][data-ledger-id="wife"]');
  await expect(row).toContainText('50');
  await expect(row.getByRole('button')).toBeDisabled();
  await expect(row).toContainText('recorded payment');
});

test('Card bank and wife settlements remain independent and wife mode normalizes safely', async ({ page }) => {
  await seed(page);
  await page.locator('[data-route="card"]').click();
  await expect(page.locator('[data-bank-total]')).toContainText('115');
  await expect(page.locator('[data-wife-total]')).toContainText('75');
  await page.locator('[data-ledger-kind="bank"][data-ledger-id="lunch"]').getByRole('button').click();
  await expect(page.locator('[data-wife-total]')).toContainText('75');
  await page.locator('[data-ledger-kind="wife"][data-ledger-id="wife"]').getByRole('button').click();
  const storedAfterWife = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(storedAfterWife.transactions.wife.liabilitySettled).toBe(false);
  expect(storedAfterWife.transactions.wife.wifeSettled).toBe(true);
  await expect(page.locator('[data-wife-payment]')).toHaveCount(0);
  await page.locator('[data-route="plan"]').click();
  await page.locator('[data-setting-wife]').uncheck();
  await page.locator('[data-route="card"]').click();
  await expect(page.locator('#wife-heading')).toHaveCount(0);
});

test('Plan and Card remain usable at narrow portrait, landscape, and increased text size', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('[data-route="plan"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 667, height: 375 });
  await page.locator('[data-route="card"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.locator('[data-route="plan"]').click();
  const last = page.locator('[data-backup-import]');
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeVisible();
  const box = await last.boundingBox();
  const navBox = await page.locator('.bottom-nav').boundingBox();
  expect(box.y).toBeLessThan(navBox.y);
});
