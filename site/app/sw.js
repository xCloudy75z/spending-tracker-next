const CACHE_PREFIX = 'spending-tracker-next-app-';
const CACHE_NAME = CACHE_PREFIX + '1.0.0';
const APP_SHELL = './index.html';
const SHELL_ASSETS = [
  './', './index.html', './manifest.webmanifest', './assets/app.css', './assets/brand/mark.svg',
  './assets/icons/icon-180.png', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-512-maskable.png',
  './src/main.js', './src/app-store.js', './src/i18n.js', './src/router.js', './src/domain/backup.js', './src/domain/csv.js',
  './src/domain/cycles.js', './src/domain/dates.js', './src/domain/liabilities.js', './src/domain/model.js', './src/domain/planning.js',
  './src/domain/sms.js', './src/domain/transactions.js', './src/platform/clock.js', './src/platform/downloads.js', './src/platform/pwa.js',
  './src/platform/storage.js', './src/ui/activity.js', './src/ui/backup-dialog.js', './src/ui/card.js', './src/ui/dom.js',
  './src/ui/plan.js', './src/ui/sms-dialog.js', './src/ui/today.js', './src/ui/transaction-dialog.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)),
  )).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(APP_SHELL)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  })));
});
