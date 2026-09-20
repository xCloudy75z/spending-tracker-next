import { createAppStore } from './app-store.js';
import { createEmptyState } from './domain/model.js';
import { t, setDocumentLocale } from './i18n.js';
import { createClock } from './platform/clock.js';
import { createStorage } from './platform/storage.js';
import { registerPwa } from './platform/pwa.js';
import { createRouter, parseRoute } from './router.js';
import { announce, el, text } from './ui/dom.js';
import { createTodayViewModel, renderToday } from './ui/today.js';
import { openTransactionDialog } from './ui/transaction-dialog.js';
import { confirmTransactionDelete, renderActivity } from './ui/activity.js';
import { renderPlan } from './ui/plan.js';
import { renderCard } from './ui/card.js';
import { openBackupDialog } from './ui/backup-dialog.js';
import { openSmsDialog } from './ui/sms-dialog.js';

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

function renderDefaultView(documentLike, container, route, locale, todayISO, state, store, metadata = {}, uiState = {}, rerender = () => {}) {
  const openEditor = (transaction, trigger) => openTransactionDialog({
    document: documentLike,
    state: store.getState(),
    locale,
    todayISO,
    transaction,
    trigger,
    onSubmit(command) {
      store.dispatch(command);
    },
  });
  const dispatch = command => {
    try {
      store.dispatch(command);
    } catch (error) {
      announce(documentLike, error?.code === 'CATEGORY_IN_USE' ? 'Choose a replacement category first.' : t(locale, 'error.unknown'), 'assertive');
    }
  };
  if (route === 'activity') {
    renderActivity(container, state, {
      locale,
      filters: uiState.activityFilters,
      onFilters(next) {
        uiState.activityFilters = next;
        rerender();
      },
      onEdit(id, trigger) {
        openEditor(state.transactions[id], trigger);
      },
      async onDelete(id, trigger) {
        if (await confirmTransactionDelete(documentLike, locale, state.transactions[id], trigger)) {
          dispatch({ type: 'transaction/delete', payload: { id } });
          announce(documentLike, t(locale, 'transaction.deleted'));
        }
      },
    });
    return;
  }
  if (route === 'plan') {
    renderPlan(container, state, { locale, todayISO, metadata, onCommand: dispatch, onBackup: () => uiState.openDataTools?.() });
    return;
  }
  if (route === 'card') {
    renderCard(container, state, { locale, todayISO, onCommand: dispatch });
    return;
  }
  if (route !== 'today') {
    renderPlaceholder(documentLike, container, route, locale, todayISO);
    return;
  }
  const model = createTodayViewModel(state, todayISO, {
    locale,
    lastBackupAt: metadata.lastBackupAt,
  });
  renderToday(container, model, {
    onAdd: trigger => openEditor(null, trigger),
    onEdit: (id, trigger) => openEditor(state.transactions[id], trigger),
  });
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
  let metadata = typeof storage.metadata === 'function' ? storage.metadata() : {};
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
  const uiState = { activityFilters: {} };
  setDocumentLocale(documentLike, locale);
  documentLike.documentElement.dataset.theme = initialState.settings.theme;

  const render = () => {
    const state = store.getState();
    locale = state.settings.locale;
    setDocumentLocale(documentLike, locale);
    documentLike.documentElement.dataset.theme = state.settings.theme;
    updateNavigation(documentLike, route, locale);
    (dependencies.renderView || renderDefaultView)(documentLike, view, route, locale, todayISO, state, store, metadata, uiState, render);
  };

  const openSms = trigger => openSmsDialog({
    document: documentLike,
    state: store.getState(),
    locale,
    todayISO,
    trigger,
    onSubmit(command) { store.dispatch(command); },
  });
  const openDataTools = trigger => openBackupDialog({
    document: documentLike,
    locale,
    todayISO,
    trigger: trigger || saveControl,
    store,
    storage,
    getState: () => store.getState(),
    onMetadataChange() {
      metadata = storage.metadata();
      render();
    },
    onOpenSms: openSms,
  });
  uiState.openDataTools = openDataTools;
  const onSaveControl = () => openDataTools(saveControl);
  saveControl?.addEventListener('click', onSaveControl);

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
  lifecycle.start();
  router.start();

  let pwaController = null;
  const showPwaState = status => {
    documentLike.querySelector('[data-pwa-banner]')?.remove();
    if (!['offline', 'update-ready'].includes(status)) return;
    const banner = el(documentLike, 'div', { className: 'pwa-banner', attrs: { 'data-pwa-banner': '', role: 'status' } });
    banner.append(el(documentLike, 'span', { text: t(locale, status === 'offline' ? 'pwa.offline' : 'pwa.updateReady') }));
    if (status === 'update-ready') {
      const update = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'pwa.updateNow'), attrs: { 'data-pwa-update': '' } });
      update.addEventListener('click', () => pwaController?.activateUpdate());
      banner.append(update);
    }
    root.prepend(banner);
  };
  const pwaRegistration = (dependencies.registerPwa || registerPwa)({ navigator: windowLike.navigator, window: windowLike, onState: showPwaState })
    .then(controller => { pwaController = controller; })
    .catch(() => showPwaState('unsupported'));

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
      saveControl?.removeEventListener('click', onSaveControl);
      void pwaRegistration;
    },
  };
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('#app');
  if (root) mountApp(root);
}
