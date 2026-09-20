export function stateWithCycle(cycle = {}) {
  const completeCycle = {
    id: 'c1',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    startBudget: 3_000,
    archivedAt: null,
    createdAt: '2026-09-01T08:00:00.000+04:00',
    ...cycle,
  };
  return {
    schemaVersion: 1,
    settings: { activeCycleId: completeCycle.id },
    categories: {},
    cycles: { [completeCycle.id]: completeCycle },
    transactions: {},
    wifePayments: {},
  };
}

export function stateWithSpending() {
  const state = stateWithCycle();
  state.transactions = {
    t1: {
      id: 't1', cycleId: 'c1', categoryId: 'food', date: '2026-09-10',
      amount: 400, isRefund: false, isExcludedFromPace: false,
    },
    t2: {
      id: 't2', cycleId: 'c1', categoryId: 'food', date: '2026-09-20',
      amount: 50, isRefund: false, isExcludedFromPace: false,
    },
    t3: {
      id: 't3', cycleId: 'c1', categoryId: 'other', date: '2026-09-20',
      amount: 25, isRefund: false, isExcludedFromPace: true,
    },
  };
  return state;
}
