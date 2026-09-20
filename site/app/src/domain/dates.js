const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseISODate(value) {
  const match = ISO_DATE.exec(String(value));
  if (!match) throw new TypeError(`invalid ISO date: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new TypeError(`invalid ISO date: ${value}`);
  }
  return { year, month, day };
}

export function isValidISODate(value) {
  try {
    parseISODate(value);
    return true;
  } catch {
    return false;
  }
}

function toDays({ year, month, day }) {
  let adjustedYear = year;
  if (month <= 2) adjustedYear -= 1;
  const era = Math.floor((adjustedYear >= 0 ? adjustedYear : adjustedYear - 399) / 400);
  const yearOfEra = adjustedYear - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function fromDays(value) {
  let days = value + 719468;
  const era = Math.floor((days >= 0 ? days : days - 146096) / 146097);
  const dayOfEra = days - era * 146097;
  const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365);
  let year = yearOfEra + era * 400;
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth + (shiftedMonth < 10 ? 3 : -9);
  if (month <= 2) year += 1;
  return { year, month, day };
}

function formatISODate({ year, month, day }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addDays(isoDate, count) {
  if (!Number.isInteger(count)) throw new TypeError('day count must be an integer');
  return formatISODate(fromDays(toDays(parseISODate(isoDate)) + count));
}

export function daysInclusive(startISO, endISO) {
  const start = toDays(parseISODate(startISO));
  const end = toDays(parseISODate(endISO));
  if (end < start) throw new RangeError('end date is before start date');
  return end - start + 1;
}
