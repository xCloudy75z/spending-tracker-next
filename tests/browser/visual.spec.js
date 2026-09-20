import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const visualState = {
  schemaVersion: 1,
  settings: { currency: 'AED', salaryDay: 25, theme: 'light', activeCycleId: 'sep', locale: 'en', lastUsedCategoryId: 'food', localTimestamps: true, wifeTracking: true },
  categories: {
    food: { id: 'food', name: 'Food', icon: 'F', color: '#24766B', order: 0, isArchived: false, budget: 700, budgetPeriod: 'monthly' },
    travel: { id: 'travel', name: 'Travel', icon: 'T', color: '#A46616', order: 1, isArchived: false, budget: 300, budgetPeriod: 'monthly' },
  },
  cycles: { sep: { id: 'sep', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 2500, archivedAt: null } },
  transactions: {
    lunch: { id: 'lunch', cycleId: 'sep', categoryId: 'food', date: '2026-09-20', amount: 42.75, kind: 'expense', note: 'Lunch', isRefund: false, isExcludedFromPace: false, exclusionSource: null, isCredit: false, creditSource: null, liabilitySettled: false, settledAt: null, byWife: false, wifeSettled: false, wifeSettledAt: null, source: 'manual' },
    taxi: { id: 'taxi', cycleId: 'sep', categoryId: 'travel', date: '2026-09-19', amount: 25, kind: 'expense', note: 'Taxi', isRefund: false, isExcludedFromPace: false, exclusionSource: null, isCredit: true, creditSource: 'explicit', liabilitySettled: false, settledAt: null, byWife: false, wifeSettled: false, wifeSettledAt: null, source: 'sms' },
  },
  wifePayments: {},
};

test('visual evidence captures all primary screens without horizontal clipping', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(value => {
    if (!localStorage.getItem('spending-tracker-next:state:v1')) localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(value));
  }, visualState);
  await page.goto('app/');
  const output = path.join(process.cwd(), 'evidence', 'screenshots');
  await mkdir(output, { recursive: true });
  for (const route of ['today', 'activity', 'plan', 'card']) {
    await page.locator(`[data-route="${route}"]`).click();
    await expect(page.locator(`[data-view="${route}"]`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    if (process.env.CAPTURE_EVIDENCE !== '0') {
      await page.screenshot({ path: path.join(output, `${testInfo.project.name}-${route}.png`), fullPage: true });
    }
  }

  if (process.env.CAPTURE_EVIDENCE === '0') return;

  async function applyPreferences(locale, theme) {
    await page.evaluate(({ locale: nextLocale, theme: nextTheme }) => {
      const key = 'spending-tracker-next:state:v1';
      const state = JSON.parse(localStorage.getItem(key));
      state.settings.locale = nextLocale;
      state.settings.theme = nextTheme;
      localStorage.setItem(key, JSON.stringify(state));
    }, { locale, theme });
    await page.reload();
  }

  await applyPreferences('en', 'dark');
  for (const route of ['today', 'activity', 'plan', 'card']) {
    await page.locator(`[data-route="${route}"]`).click();
    await expect(page.locator(`[data-view="${route}"]`)).toBeVisible();
    await page.screenshot({ path: path.join(output, `${testInfo.project.name}-dark-${route}.png`), fullPage: true });
  }

  await applyPreferences('ar', 'light');
  for (const route of ['today', 'activity', 'plan', 'card']) {
    await page.locator(`[data-route="${route}"]`).click();
    await expect(page.locator(`[data-view="${route}"]`)).toBeVisible();
    await page.screenshot({ path: path.join(output, `${testInfo.project.name}-arabic-${route}.png`), fullPage: true });
  }

  await applyPreferences('en', 'light');
  await page.locator('[data-route="today"]').click();
  await page.locator('[data-add-transaction]').click();
  await page.screenshot({ path: path.join(output, `${testInfo.project.name}-dialog-transaction.png`), fullPage: true });
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.locator('[data-save-state]').click();
  await page.screenshot({ path: path.join(output, `${testInfo.project.name}-dialog-backup.png`), fullPage: true });
  await page.getByRole('button', { name: 'Close' }).click();
  await page.evaluate(() => {
    localStorage.setItem('spending-tracker-next:state:v1', '{broken');
    localStorage.removeItem('spending-tracker-next:snapshot:v1');
  });
  await page.reload();
  await page.screenshot({ path: path.join(output, `${testInfo.project.name}-error-corrupt-storage.png`), fullPage: true });
});
