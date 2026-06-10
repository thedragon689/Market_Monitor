import { useEffect, useState } from 'react';
import { fetchMarketBatch } from '../utils/fetchMarket';
import { getTimeframeDays } from '../data/chartTimeframes';

function normalizeSeries(history) {
  if (!history?.length) return [];
  const base = history[0].price;
  if (!base) return [];
  return history.map((p) => ({
    date: p.date,
    pct: Number((((p.price / base - 1) * 100).toFixed(3))),
  }));
}

/** Carica storici multi-asset e li normalizza a % performance. */
export function useCompareHistories(picks, timeframeId) {
  const [seriesById, setSeriesById] = useState({});
  const [loading, setLoading] = useState(false);

  const pickKey = picks.map((p) => `${p.type}:${p.id}`).join('|');

  useEffect(() => {
    if (!picks.length) {
      setSeriesById({});
      return undefined;
    }

    let cancelled = false;
    const days = getTimeframeDays(timeframeId);

    (async () => {
      setLoading(true);
      const next = {};
      const limit = Math.max(days, 30);

      try {
        const { results } = await fetchMarketBatch(picks, { limit });
        if (cancelled) return;

        results.forEach((row, idx) => {
          const pick = picks.find(
            (p) => p.id.toUpperCase() === String(row.symbol).toUpperCase()
          );
          if (!row?.history?.length || !pick) return;
          const sliced = row.history.slice(-days);
          next[pick.id] = {
            name: pick.name || pick.id,
            color: pick.color,
            points: normalizeSeries(sliced),
            idx,
          };
        });
      } catch {
        /* skip batch */
      }

      if (!cancelled) {
        setSeriesById(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pickKey è il proxy stabile di picks
  }, [pickKey, timeframeId]);

  const chartData = (() => {
    const ids = Object.keys(seriesById);
    if (!ids.length) return [];

    const dateMap = new Map();
    for (const id of ids) {
      for (const pt of seriesById[id].points) {
        if (!dateMap.has(pt.date)) dateMap.set(pt.date, { date: pt.date });
        dateMap.get(pt.date)[id] = pt.pct;
      }
    }
    return [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  })();

  return { seriesById, chartData, loading };
}
