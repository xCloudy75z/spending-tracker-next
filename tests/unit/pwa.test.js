import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerPwa } from '../../site/app/src/platform/pwa.js';

const manifest = JSON.parse(await readFile(new URL('../../site/app/manifest.webmanifest', import.meta.url), 'utf8'));

test('manifest is scoped, standalone, bilingual-safe, and provides install icon purposes', () => {
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'en');
  assert.equal(manifest.dir, 'auto');
  assert.equal(manifest.theme_color.toLowerCase(), '#f3f0e8');
  assert.equal(manifest.background_color.toLowerCase(), '#f3f0e8');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose.includes('any')));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose.includes('any')));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose.includes('maskable')));
  assert.ok(manifest.screenshots.length >= 1);
});

test('service worker cache cleanup is restricted to the product prefix', async () => {
  const source = await readFile(new URL('../../site/app/sw.js', import.meta.url), 'utf8');
  assert.match(source, /spending-tracker-next-app-/);
  const cleanup = source.slice(source.indexOf('caches.keys()'), source.indexOf("self.addEventListener('message'"));
  assert.match(cleanup, /names\.filter\(name => name\.startsWith\(CACHE_PREFIX\) && name !== CACHE_NAME\)\.map\(name => caches\.delete\(name\)\)/);
  assert.equal((source.match(/caches\.delete\(/g) || []).length, 1);
});

test('registerPwa reports unsupported without service-worker support', async () => {
  const states = [];
  const result = await registerPwa({ navigator: {}, onState: state => states.push(state) });
  assert.equal(result.status, 'unsupported');
  assert.deepEqual(states, ['unsupported']);
});

test('waiting updates activate only after an explicit request', async () => {
  const messages = [];
  const states = [];
  let controllerChange;
  let reloads = 0;
  const registration = {
    waiting: { postMessage: message => messages.push(message) },
    addEventListener() {},
  };
  const navigatorLike = {
    onLine: true,
    serviceWorker: { controller: {}, register: async () => registration, addEventListener(name, callback) { if (name === 'controllerchange') controllerChange = callback; } },
  };
  const controller = await registerPwa({ navigator: navigatorLike, window: { addEventListener() {}, location: { reload() { reloads += 1; } } }, onState: state => states.push(state) });
  assert.deepEqual(messages, []);
  assert.ok(states.includes('update-ready'));
  controllerChange();
  assert.equal(reloads, 0);
  controller.activateUpdate();
  assert.deepEqual(messages, [{ type: 'ACTIVATE_UPDATE' }]);
  controllerChange();
  controllerChange();
  assert.equal(reloads, 1);
});
