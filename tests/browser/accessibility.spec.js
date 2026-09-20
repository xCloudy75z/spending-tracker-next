import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function state() {
  return {
    schemaVersion: 1,
    settings: { currency: 'AED', salaryDay: 25, theme: 'system', activeCycleId: 'sep', locale: 'en', lastUsedCategoryId: 'food', localTimestamps: true, wifeTracking: true },
    categories: { food: { id: 'food', name: 'Food', icon: 'F', color: '#24766B', order: 0, isArchived: false, budget: 500, budgetPeriod: 'monthly' } },
    cycles: { sep: { id: 'sep', startDate: '2026-09-01', endDate: '2026-09-30', startBudget: 1000 } },
    transactions: {}, wifePayments: {},
  };
}

async function seed(page, value = state()) {
  await page.addInitScript(initial => {
    if (sessionStorage.getItem('accessibility-seeded')) return;
    localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(initial));
    sessionStorage.setItem('accessibility-seeded', 'true');
  }, value);
  await page.goto('/app/');
}

async function expectNoSeriousViolations(page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(item => ['serious', 'critical'].includes(item.impact));
  expect(serious, serious.map(item => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
}

test('accessibility scan passes every primary workspace and dark mode', async ({ page }) => {
  await seed(page);
  await expect(page.locator('main')).toHaveCount(1);
  for (const route of ['today', 'activity', 'plan', 'card']) {
    await page.locator(`[data-route="${route}"]`).click();
    await expect(page.locator(`[data-view="${route}"] h1`)).toHaveCount(1);
    await expectNoSeriousViolations(page);
  }
  await page.locator('[data-route="plan"]').click();
  await page.locator('[data-setting-theme]').selectOption('dark');
  await page.reload();
  await page.locator('[data-route="plan"]').click();
  await expect(page.locator('[data-view="plan"] h1')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => page.evaluate(() => ({
    ink: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
    body: getComputedStyle(document.body).color,
    workspace: getComputedStyle(document.querySelector('[data-view="plan"]')).color,
    control: getComputedStyle(document.querySelector('#cycle-start-setting')).color,
  }))).toEqual({
    ink: '#edf3f0',
    body: 'rgb(237, 243, 240)',
    workspace: 'rgb(237, 243, 240)',
    control: 'rgb(237, 243, 240)',
  });
  await expectNoSeriousViolations(page);
});

test('accessibility scan passes transaction, backup, and SMS dialogs with focus restoration', async ({ page }) => {
  await seed(page);
  const add = page.locator('[data-add-transaction]');
  await add.click();
  await expect(page.locator('#transaction-amount')).toBeFocused();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(add).toBeFocused();
  const tools = page.locator('[data-save-state]');
  await tools.click();
  await expectNoSeriousViolations(page);
  await page.locator('[data-open-sms]').click();
  await expect(page.locator('#sms-input')).toBeFocused();
  await expectNoSeriousViolations(page);
});
