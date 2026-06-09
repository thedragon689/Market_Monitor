/** Preset timeframe storico — max 120 giorni (limite API). */

export const CHART_TIMEFRAMES = [
  { id: '1D', label: '1D', days: 5, hint: 'Ultimi 5 giorni' },
  { id: '1W', label: '1W', days: 7, hint: 'Ultima settimana' },
  { id: '1M', label: '1M', days: 30, hint: 'Ultimo mese' },
  { id: '3M', label: '3M', days: 90, hint: 'Ultimi 3 mesi' },
  { id: '1Y', label: '1A', days: 120, hint: 'Ultimo anno (max API)' },
  { id: 'MAX', label: 'MAX', days: 120, hint: 'Tutto lo storico' },
];

export const DEFAULT_TIMEFRAME = '3M';

const LEGACY_MAP = { '1S': '1W' };

export function normalizeTimeframe(id) {
  const mapped = LEGACY_MAP[id] ?? id;
  return CHART_TIMEFRAMES.some((t) => t.id === mapped) ? mapped : DEFAULT_TIMEFRAME;
}

export function getTimeframeDays(id) {
  const tf = CHART_TIMEFRAMES.find((t) => t.id === normalizeTimeframe(id));
  return tf?.days ?? 90;
}

export function sliceHistoryByTimeframe(history, timeframeId) {
  if (!history?.length) return [];
  const days = getTimeframeDays(timeframeId);
  const want = Math.max(days, 2);
  return history.slice(-Math.min(want, history.length));
}
