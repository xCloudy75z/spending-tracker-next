const PREFIX = 'spending-tracker-upgrade-test-';
const CACHE = PREFIX + 'v2';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.put('./version', new Response('v2'))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)),
  )).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
