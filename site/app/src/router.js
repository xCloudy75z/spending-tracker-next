export const ROUTES = Object.freeze(['today', 'activity', 'plan', 'card']);

export function parseRoute(hash) {
  const candidate = String(hash || '').replace(/^#\/?/, '').split(/[/?]/, 1)[0];
  return ROUTES.includes(candidate) ? candidate : 'today';
}

export function formatRoute(route) {
  if (!ROUTES.includes(route)) throw new RangeError('unknown route: ' + route);
  return '#/' + route;
}

export function createRouter(windowLike, onChange) {
  if (!windowLike || typeof windowLike.addEventListener !== 'function') throw new TypeError('window-like object required');
  if (typeof onChange !== 'function') throw new TypeError('route callback required');
  const emit = () => onChange(parseRoute(windowLike.location.hash));
  return {
    start() {
      windowLike.addEventListener('hashchange', emit);
      emit();
    },
    stop() {
      windowLike.removeEventListener('hashchange', emit);
    },
    navigate(route) {
      windowLike.location.hash = formatRoute(route);
    },
    get current() {
      return parseRoute(windowLike.location.hash);
    },
  };
}
