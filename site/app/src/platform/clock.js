function localISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) throw new TypeError('clock returned an invalid Date');
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => index === 0 ? String(part).padStart(4, '0') : String(part).padStart(2, '0'))
    .join('-');
}

export function createClock(now = () => new Date()) {
  if (typeof now !== 'function') throw new TypeError('now must be a function');
  return {
    now: () => new Date(now().valueOf()),
    todayISO: () => localISODate(now()),
  };
}

export function didLocalDayChange(previousISO, currentISO) {
  return previousISO !== currentISO;
}
