import { test, expect } from '@playwright/test';

test('application shell is semantic and hash navigation follows browser history', async ({ page }) => {
  await page.goto('/app/');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('nav[aria-label="Primary"]')).toHaveCount(1);
  await expect(page.locator('[data-route="today"]')).toHaveAttribute('aria-current', 'page');
  await page.locator('[data-route="card"]').click();
  await expect(page).toHaveURL(/#\/card$/);
  await expect(page.locator('[data-route="card"]')).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(page.locator('[data-route="today"]')).toHaveAttribute('aria-current', 'page');
});

test('skip link is first in keyboard order and moves focus to main content', async ({ page }, testInfo) => {
  await page.goto('/app/');
  if (testInfo.project.name === 'iphone-webkit') {
    await page.locator('.skip-link').focus();
  } else {
    await page.keyboard.press('Tab');
  }
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('reload retains valid local state without writing first-run defaults', async ({ page }) => {
  await page.goto('/app/');
  const empty = {
    schemaVersion: 1,
    settings: {
      currency: 'AED', salaryDay: 25, theme: 'system', activeCycleId: null,
      locale: 'ar', lastUsedCategoryId: null, localTimestamps: true, wifeTracking: true,
    },
    categories: {}, cycles: {}, transactions: {}, wifePayments: {},
  };
  await page.evaluate(state => localStorage.setItem('spending-tracker-next:state:v1', JSON.stringify(state)), empty);
  await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('data-store-status', 'ready');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('storage denial shows recovery guidance and still permits backup inspection', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      const error = new Error('denied');
      error.name = 'SecurityError';
      throw error;
    };
  });
  await page.goto('/app/');
  await expect(page.locator('[data-storage-error]')).toBeVisible();
  await expect(page.locator('input[type="file"][data-backup-inspect]')).toBeVisible();
  await expect(page.locator('[data-save-state]')).toHaveAttribute('aria-disabled', 'true');
});
