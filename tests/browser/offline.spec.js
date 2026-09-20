import { test, expect } from '@playwright/test';

test('offline cold launch and every primary route work from the scoped cache', async ({ page, context }, testInfo) => {
  await page.goto('app/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  if (testInfo.project.name.startsWith('iphone')) {
    const cached = await page.evaluate(async () => ({
      shell: Boolean(await caches.match('./index.html')),
      main: Boolean(await caches.match('./src/main.js')),
      styles: Boolean(await caches.match('./assets/app.css')),
    }));
    expect(cached).toEqual({ shell: true, main: true, styles: true });
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  } else {
    await context.setOffline(true);
    await page.reload();
  }
  await expect(page.locator('[data-view="today"]')).toBeVisible();
  for (const route of ['activity', 'plan', 'card', 'today']) {
    await page.locator(`[data-route="${route}"]`).click();
    await expect(page.locator(`[data-view="${route}"]`)).toBeVisible();
  }
  await expect(page.locator('[data-pwa-banner]')).toContainText(/offline/i);
  if (!testInfo.project.name.startsWith('iphone')) await context.setOffline(false);
});
