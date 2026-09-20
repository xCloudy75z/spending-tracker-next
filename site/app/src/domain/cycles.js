import { daysInclusive, isValidISODate } from './dates.js';

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function signedAmount(transaction) {
  const amount = Number(transaction.amount) || 0;
  return transaction.isRefund ? -amount : amount;
}

export function effectiveCycleBudget(cycle) {
  const budget = money(cycle?.startBudget || 0);
  const savings = cycle?.savingsTreatment === 'deduct' ? money(cycle?.savingsTarget || 0) : 0;
  return Math.max(0, money(budget - savings));
}

export function cycleForDate(state, dateISO) {
  if (!isValidISODate(dateISO)) throw new TypeError(`invalid ISO date: ${dateISO}`);
  const cycles = Object.values(state?.cycles || {}).filter(Boolean);
  for (const cycle of cycles) {
    if (!isValidISODate(cycle.startDate) || !isValidISODate(cycle.endDate) || cycle.endDate < cycle.startDate) {
      throw new TypeError(`invalid cycle boundary: ${cycle.id || 'unknown'}`);
    }
  }
  const matches = cycles.filter(cycle => dateISO >= cycle.startDate && dateISO <= cycle.endDate);
  if (matches.length > 1) {
    const error = new Error(`multiple cycles contain ${dateISO}`);
    error.code = 'INVARIANT_OVERLAPPING_CYCLES';
    throw error;
  }
  return matches[0] || null;
}

export function paceStatus({ budget, spentToDate, elapsedDays, totalDays, entryCount, remainingBalance }) {
  if (remainingBalance < 0) return { state: 'over', detailKey: 'pace.over' };
  if (entryCount < 4 || elapsedDays < 3 || budget <= 0 || totalDays <= 0) {
    return { state: 'insufficient-data', detailKey: 'pace.insufficient' };
  }
  const plannedToDate = budget * (elapsedDays / totalDays);
  const ratio = plannedToDate > 0 ? spentToDate / plannedToDate : 0;
  if (ratio <= 0.85) return { state: 'ahead', detailKey: 'pace.ahead' };
  if (ratio <= 1.03) return { state: 'steady', detailKey: 'pace.steady' };
  if (ratio <= 1.15) return { state: 'watch', detailKey: 'pace.watch' };
  return { state: 'over', detailKey: 'pace.over' };
}

export function deriveToday(state, todayISO) {
  const cycle = cycleForDate(state, todayISO);
  if (!cycle) {
    return {
      cycle: null,
      budget: 0,
      spentToDate: 0,
      spentToday: 0,
      remainingBalance: 0,
      daysRemaining: 0,
      safeToSpend: 0,
      pace: { state: 'insufficient-data', detailKey: 'pace.insufficient' },
    };
  }

  const transactions = Object.values(state?.transactions || {}).filter(transaction => (
    transaction && transaction.cycleId === cycle.id && !transaction.isExcludedFromPace
  ));
  const beforeToday = transactions.filter(transaction => transaction.date < todayISO);
  const throughToday = transactions.filter(transaction => transaction.date <= todayISO);
  const todayTransactions = transactions.filter(transaction => transaction.date === todayISO);
  const totalSpent = money(transactions.reduce((sum, transaction) => sum + signedAmount(transaction), 0));
  const spentBefore = money(beforeToday.reduce((sum, transaction) => sum + signedAmount(transaction), 0));
  const spentToDate = money(throughToday.reduce((sum, transaction) => sum + signedAmount(transaction), 0));
  const spentToday = money(todayTransactions.reduce((sum, transaction) => sum + signedAmount(transaction), 0));
  const budget = effectiveCycleBudget(cycle);
  const remainingBalance = money(budget - totalSpent);
  const daysRemaining = daysInclusive(todayISO, cycle.endDate);
  const dailyLimit = daysRemaining > 0 ? money((budget - spentBefore) / daysRemaining) : 0;
  const safeToSpend = money(dailyLimit - spentToday);
  const totalDays = daysInclusive(cycle.startDate, cycle.endDate);
  const elapsedDays = daysInclusive(cycle.startDate, todayISO);

  return {
    cycle,
    budget,
    spentToDate,
    spentToday,
    remainingBalance,
    daysRemaining,
    safeToSpend,
    pace: paceStatus({
      budget,
      spentToDate,
      elapsedDays,
      totalDays,
      entryCount: throughToday.length,
      remainingBalance,
    }),
  };
}
