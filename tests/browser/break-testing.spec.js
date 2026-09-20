import { test, expect } from '@playwright/test';

test('break testing rejects zero, negative, and excessive transaction amounts', async ({ page }) => {
  const state = {
    schemaVersion: 1,
    settings: { currency: 'AED', salaryDay: 25, theme: 'system', activeCycleId: 'sep', locale: 'en', lastUsedCategoryId: 'food', localTimestamps: true, wifeTracking: true },
    categories: { food: { id: 'food', name: 'Food', icon: 'F', color: '#24766B', order: 0, isArchived: false, budget: 500, budgetPeriod: 'monthly' } },
    cycles: { sep: { id: 'sep', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000 } },
    transactions: {}, wifePayments: {},
  };
  await page.addInitScript(initial => localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(initial)), state);
  await page.goto('/app/');
  await page.locator('[data-add-transaction]').click();
  for (const amount of ['0', '-1', '1000000000']) {
    await page.locator('#transaction-amount').fill(amount);
    await expect(page.locator('[data-transaction-save]')).toBeDisabled();
  }
  await page.locator('#transaction-amount').fill('999999999.99');
  await expect(page.locator('[data-transaction-save]')).toBeEnabled();
});

test('break testing keeps the last control reachable above fixed navigation', async ({ page }) => {
  await page.goto('/app/');
  await page.locator('[data-route="plan"]').click();
  const control = page.locator('[data-backup-import]');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const controlBox = await control.boundingBox();
  const navBox = await page.locator('.bottom-nav').boundingBox();
  expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(navBox.y);
});
