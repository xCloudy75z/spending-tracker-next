import { createAppStore } from './app-store.js';
import { createEmptyState } from './domain/model.js';
import { t, setDocumentLocale } from './i18n.js';
import { createClock } from './platform/clock.js';
import { createStorage } from './platform/storage.js';
import { createRouter, parseRoute } from './router.js';
import { el, text } from './ui/dom.js';

export function createLifecycleController(options) {
  const eventTarget = options.eventTarget;
  const visibilityTarget = options.visibilityTarget || eventTarget;
  const visibilitySource = options.visibilitySource || visibilityTarget;
  let currentDay = null;
  let started = false;

  const refresh = () => {
    const nextDay = options.clock.todayISO();
    if (nextDay !== currentDay) {
      currentDay = nextDay;
      options.onRender(currentDay);
      return true;
    }
    return false;
  };
  const onVisibility = () => {
    if (visibilitySource.visibilityState === 'visible') refresh();
  };
  const onResume = () => refresh();

  return {
    start() {
      if (started) return;
      started = true;
      refresh();
      visibilityTarget.addEventListener('visibilitychange', onVisibility);
      eventTarget.addEventListener('focus', onResume);
      eventTarget.addEventListener('pageshow', onResume);
    },
    stop() {
      if (!started) return;
      started = false;
      visibilityTarget.removeEventListener('visibilitychange', onVisibility);
      eventTarget.removeEventListener('focus', onResume);
      eventTarget.removeEventListener('pageshow', onResume);
    },
    refreshForCurrentDay: refresh,
    get todayISO() {
      return currentDay;
    },
  };
}

function renderPlaceholder(documentLike, container, route, locale, todayISO) {
  const titles = {
    today: t(locale, 'nav.today'),
    activity: t(locale, 'activity.title'),
    plan: t(locale, 'plan.title'),
    card: t(locale, 'card.title'),
  };
  const descriptions = {
    today: t(locale, 'app.tagline'),
    activity: t(locale, 'activity.noResults'),
    plan: t(locale, 'plan.noCategories'),
    card: t(locale, 'card.noBankBalance'),
  };
  const section = el(documentLike, 'section', { className: 'view-shell', attrs: { 'data-view': route } });
  section.append(
    el(documentLike, 'p', { className: 'view-date', text: todayISO }),
    el(documentLike, 'h1', { text: titles[route] }),
    el(documentLike, 'p', { text: descriptions[route] }),
  );
  container.replaceChildren(section);
}

function updateNavigation(documentLike, route, locale) {
  for (const link of documentLike.querySelectorAll('[data-route]')) {
    const selected = link.dataset.route === route;
    if (selected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    const label = link.querySelector('[data-nav-label]');
    if (label) label.textContent = t(locale, 'nav.' + link.dataset.route);
  }
}

function renderStorageError(documentLike, container, locale, status) {
  const section = el(documentLike, 'section', {
    className: 'storage-error',
    attrs: { 'data-storage-error': '', role: 'alert' },
  });
  section.append(
    el(documentLike, 'h1', { text: t(locale, 'app.name') }),
    el(documentLike, 'p', {
      text: status === 'corrupt' ? t(locale, 'error.invalidBackup') : t(locale, 'error.storageUnavailable'),
    }),
    el(documentLike, 'label', { text: t(locale, 'backup.import'), attrs: { for: 'backup-inspect' } }),
    el(documentLike, 'input', {
      id: 'backup-inspect',
      type: 'file',
      attrs: { accept: 'application/json,.json', 'data-backup-inspect': '' },
    }),
  );
  container.replaceChildren(section);
}

export function mountApp(root, dependencies = {}) {
  const documentLike = dependencies.document || root.ownerDocument;
  const windowLike = dependencies.window || documentLike.defaultView;
  const clock = dependencies.clock || createClock();
  const storage = dependencies.storage || createStorage(windowLike.localStorage);
  const loadResult = storage.load();
  root.dataset.storeStatus = loadResult.status;
  const view = documentLike.querySelector('#view');
  const saveControl = documentLike.querySelector('[data-save-state]');

  if (loadResult.status === 'unavailable' || loadResult.status === 'corrupt') {
    const locale = 'en';
    setDocumentLocale(documentLike, locale);
    saveControl?.setAttribute('aria-disabled', 'true');
    if (saveControl) saveControl.disabled = true;
    renderStorageError(documentLike, view, locale, loadResult.status);
    return { status: loadResult.status, destroy() {} };
  }

  const initialState = loadResult.state || createEmptyState();
  const store = createAppStore({
    initialState,
    persist: storage,
    context: dependencies.context || {},
    backupOptions: dependencies.backupOptions || {},
  });
  let locale = initialState.settings.locale;
  let route = parseRoute(windowLike.location.hash);
  let todayISO = null;
  setDocumentLocale(documentLike, locale);
  documentLike.documentElement.dataset.theme = initialState.settings.theme;

  const render = () => {
    const state = store.getState();
    locale = state.settings.locale;
    setDocumentLocale(documentLike, locale);
    updateNavigation(documentLike, route, locale);
    (dependencies.renderView || renderPlaceholder)(documentLike, view, route, locale, todayISO, state, store);
  };

  const router = createRouter(windowLike, nextRoute => {
    route = nextRoute;
    render();
  });
  const lifecycle = createLifecycleController({
    clock,
    eventTarget: windowLike,
    visibilityTarget: documentLike,
    visibilitySource: documentLike,
    onRender(nextToday) {
      todayISO = nextToday;
      render();
    },
  });
  const unsubscribe = store.subscribe(() => render());
  router.start();
  lifecycle.start();

  if (loadResult.status === 'recovered-snapshot') {
    const banner = el(documentLike, 'p', {
      className: 'recovery-banner',
      attrs: { role: 'status' },
    }, text(documentLike, 'Recovered from the last local snapshot.'));
    root.prepend(banner);
  }

  return {
    status: loadResult.status,
    store,
    router,
    lifecycle,
    refreshForCurrentDay: () => lifecycle.refreshForCurrentDay(),
    destroy() {
      unsubscribe();
      router.stop();
      lifecycle.stop();
    },
  };
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('#app');
  if (root) mountApp(root);
}
