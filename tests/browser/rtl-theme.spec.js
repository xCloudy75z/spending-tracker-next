import { test, expect } from '@playwright/test';

test('Arabic RTL preserves data, navigation order, mixed notes, and readable AED values', async ({ page }) => {
  const note = 'غداء Dubai 🍽️ ' + 'مختلط English '.repeat(30);
  const value = {
    schemaVersion: 1,
    settings: { currency: 'AED', salaryDay: 25, theme: 'dark', activeCycleId: 'sep', locale: 'ar', lastUsedCategoryId: 'food', localTimestamps: true, wifeTracking: true },
    categories: { food: { id: 'food', name: 'طعام Food', icon: 'F', color: '#24766B', order: 0, isArchived: false, budget: 500, budgetPeriod: 'monthly' } },
    cycles: { sep: { id: 'sep', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000 } },
    transactions: { mixed: { id: 'mixed', cycleId: 'sep', categoryId: 'food', date: '2026-09-20', amount: 12.5, note: note.slice(0, 500), isRefund: false, isExcludedFromPace: false, isCredit: false, liabilitySettled: false, byWife: false, wifeSettled: false } },
    wifePayments: {},
  };
  await page.addInitScript(initial => localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(initial)), value);
  await page.goto('/app/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.bottom-nav [data-route]')).toHaveCount(4);
  await expect(page.locator('.activity-row__note bdi')).toHaveAttribute('dir', 'auto');
  await expect(page.locator('[data-safe-to-spend]')).toContainText(/AED|د\.إ/);
  await page.locator('[data-route="plan"]').click();
  await page.locator('[data-setting-locale]').selectOption('en');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('spending-tracker-next:state:v1')));
  expect(stored.transactions.mixed.note).toBe(value.transactions.mixed.note);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
