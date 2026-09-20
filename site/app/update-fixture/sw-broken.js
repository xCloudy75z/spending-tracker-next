self.addEventListener('install', event => {
  event.waitUntil(Promise.reject(new Error('simulated interrupted install')));
});
