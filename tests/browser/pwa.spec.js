import { test, expect } from '@playwright/test';

test('PWA manifest, icons, scope, and unrelated shared-origin cache isolation are valid', async ({ page }) => {
  await page.goto('app/');
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

test('an interrupted worker upgrade retains v1 and v2 activates only after an explicit message', async ({ page }) => {
  await page.goto('app/');
  const result = await page.evaluate(async () => {
    const scope = './update-fixture/';
    const waitForState = (worker, state) => new Promise((resolve, reject) => {
      if (worker.state === state) return resolve();
      const timer = setTimeout(() => reject(new Error(`worker did not reach ${state}`)), 5000);
      worker.addEventListener('statechange', () => {
        if (worker.state === state) { clearTimeout(timer); resolve(); }
      });
    });
    const waitForActive = registration => new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        if (registration.active?.state === 'activated') return resolve(registration.active);
        if (Date.now() - started > 5000) return reject(new Error('registration did not retain an active worker'));
        setTimeout(check, 20);
      };
      check();
    });
    const v1 = await navigator.serviceWorker.register('./update-fixture/sw-v1.js', { scope });
    await waitForState(v1.installing || v1.waiting || v1.active, 'activated');
    await waitForActive(v1);
    const brokenRegistration = await navigator.serviceWorker.register('./update-fixture/sw-broken.js', { scope });
    const brokenWorker = brokenRegistration.installing;
    if (brokenWorker) await waitForState(brokenWorker, 'redundant');
    const brokenRejected = brokenWorker?.state === 'redundant';
    const afterBroken = await navigator.serviceWorker.getRegistration(scope);
    await waitForActive(afterBroken);
    const activeAfterBroken = afterBroken.active?.scriptURL;
    const v2 = await navigator.serviceWorker.register('./update-fixture/sw-v2.js', { scope });
    const waiting = v2.installing || v2.waiting;
    await waitForState(waiting, 'installed');
    const beforeMessage = { active: v2.active?.scriptURL, waiting: v2.waiting?.scriptURL };
    v2.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    await waitForState(v2.waiting, 'activated');
    const cachesAfter = await caches.keys();
    await v2.unregister();
    for (const name of cachesAfter.filter(name => name.startsWith('spending-tracker-upgrade-test-'))) await caches.delete(name);
    return {
      brokenRejected,
      activeAfterBroken,
      beforeMessage,
      cachesAfter,
    };
  });
  expect(result.brokenRejected).toBe(true);
  expect(result.activeAfterBroken).toContain('sw-v1.js');
  expect(result.beforeMessage.active).toContain('sw-v1.js');
  expect(result.beforeMessage.waiting).toContain('sw-v2.js');
  expect(result.cachesAfter).toContain('spending-tracker-upgrade-test-v2');
  expect(result.cachesAfter).not.toContain('spending-tracker-upgrade-test-v1');
});
