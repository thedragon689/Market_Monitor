/** Preset timeframe storico — max 120 giorni (limite API). */

export const CHART_TIMEFRAMES = [
  { id: '1W', label: '1S', days: 7 },
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: 'MAX', label: 'MAX', days: 120 },
];

export const DEFAULT_TIMEFRAME = '3M';

export function getTimeframeDays(id) {
  return CHART_TIMEFRAMES.find((t) => t.id === id)?.days ?? 90;
}

export function sliceHistoryByTimeframe(history, timeframeId) {
  if (!history?.length) return [];
  const days = getTimeframeDays(timeframeId);
  return history.slice(-Math.min(days, history.length));
}
