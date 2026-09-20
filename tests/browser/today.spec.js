import { test, expect } from '@playwright/test';

function baseState() {
  return {
    schemaVersion: 1,
    settings: {
      currency: 'AED', salaryDay: 25, theme: 'system', activeCycleId: 'sep',
      locale: 'en', lastUsedCategoryId: 'food', localTimestamps: true, wifeTracking: true,
    },
    categories: {
      food: { id: 'food', name: 'Food', icon: 'F', color: '#24766B', order: 0, isArchived: false, budget: 900, budgetPeriod: 'monthly' },
    },
    cycles: {
      aug: { id: 'aug', startDate: '2026-08-01', endDate: '2026-08-31', startBudget: 2000 },
      sep: { id: 'sep', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 3000 },
    },
    transactions: {
      unsafe: {
        id: 'unsafe', cycleId: 'sep', categoryId: 'food', date: '2026-09-19', amount: 50,
        note: '<img src=x onerror=window.pwned=1>', isRefund: false, isExcludedFromPace: false,
        exclusionSource: null, isCredit: false, creditSource: null, liabilitySettled: false,
        settledAt: null, byWife: false, wifeSettled: false, wifeSettledAt: null,
        createdAt: '2026-09-19T10:00:00.000Z', updatedAt: '2026-09-19T10:00:00.000Z',
      },
    },
    wifePayments: {},
  };
}

async function seed(page, state = baseState()) {
  await page.addInitScript(value => {
    localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(value));
  }, state);
  await page.goto('app/');
}

test('Today leads with safe-to-spend, one pace line, and text-safe activity', async ({ page }) => {
  await seed(page);
  const heading = page.locator('.today-hero h1');
  await expect(heading).toHaveText('Safe to spend today');
  await expect(page.locator('[data-safe-to-spend]')).toContainText('AED');
  await expect(page.locator('[data-pace-state]')).toHaveCount(1);
  await expect(page.locator('.activity-row__note')).toContainText('<img src=x');
  await expect(page.locator('.activity-row__note img')).toHaveCount(0);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
});

test('Today sends a no-cycle user to Plan', async ({ page }) => {
  const state = baseState();
  state.settings.activeCycleId = null;
  state.cycles = {};
  state.transactions = {};
  await seed(page, state);
  await expect(page.locator('[data-empty-action="plan"]')).toBeVisible();
  await page.locator('[data-empty-action="plan"]').click();
  await expect(page).toHaveURL(/#\/plan$/);
});
