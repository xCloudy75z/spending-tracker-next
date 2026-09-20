export async function registerPwa(options = {}) {
  const navigatorLike = options.navigator || globalThis.navigator;
  const windowLike = options.window || globalThis.window;
  const onState = options.onState || (() => {});
  if (!navigatorLike?.serviceWorker) {
    onState('unsupported');
    return { status: 'unsupported', registration: null, activateUpdate() {} };
  }
  onState('installing');
  const registration = await navigatorLike.serviceWorker.register('./sw.js', { scope: './' });
  let reloading = false;
  let activationRequested = false;
  const reportWaiting = () => { if (registration.waiting) onState('update-ready'); };
  reportWaiting();
  registration.addEventListener?.('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') onState(navigatorLike.serviceWorker.controller ? 'update-ready' : 'ready');
    });
  });
  navigatorLike.serviceWorker.addEventListener?.('controllerchange', () => {
    if (!activationRequested || reloading) return;
    reloading = true;
    windowLike?.location?.reload?.();
  });
  windowLike?.addEventListener?.('offline', () => onState('offline'));
  windowLike?.addEventListener?.('online', () => onState('ready'));
  if (!registration.waiting) onState(navigatorLike.onLine === false ? 'offline' : 'ready');
  return {
    status: registration.waiting ? 'update-ready' : 'ready', registration,
    activateUpdate() {
      activationRequested = true;
      registration.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' });
    },
  };
}
