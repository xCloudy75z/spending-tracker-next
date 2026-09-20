import { test, expect } from '@playwright/test';

test('PWA manifest, icons, scope, and unrelated shared-origin cache isolation are valid', async ({ page }) => {
  await page.goto('/app/');
  const result = await page.evaluate(async () => {
    await caches.open('rem-money-unrelated-cache').then(cache => cache.put('/unrelated', new Response('keep')));
    const registration = await navigator.serviceWorker.ready;
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      scope: registration.scope,
      caches: await caches.keys(),
      manifestHref: document.querySelector('link[rel="manifest"]').href,
      appleIcon: document.querySelector('link[rel="apple-touch-icon"]').href,
    };
  });
  expect(result.scope).toMatch(/\/app\/$/);
  expect(result.caches).toContain('rem-money-unrelated-cache');
  expect(result.caches.some(name => name.startsWith('spending-tracker-next-app-'))).toBe(true);
  expect(result.manifestHref).toMatch(/\/app\/manifest\.webmanifest$/);
  expect(result.appleIcon).toMatch(/icon-180\.png$/);
  await expect(page.locator('.wordmark img')).toHaveJSProperty('complete', true);
});

