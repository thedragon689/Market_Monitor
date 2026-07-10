const KEY = 'market-monitor-state-v1';

const DEFAULTS = {
  view: 'explore',
  type: 'stock',
  symbol: 'AAPL',
  windowN: 5,
  horizonDays: 5,
  forecastMethod: 'both',
  historyTimeframe: '3M',
  analysisPanels: ['indicators', 'forecast', 'correlations', 'geo', 'analytics'],
  forecastPanels: ['params', 'advanced', 'geo'],
};

export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function savePersistedState(partial) {
  try {
    const prev = loadPersistedState();
    localStorage.setItem(KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {
    /* quota / private mode */
  }
}

export function getDefaultState() {
  return { ...DEFAULTS };
}
