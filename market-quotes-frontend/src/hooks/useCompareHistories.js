import { useEffect, useState } from 'react';
import { API_BASE } from '../config/api';
import { apiFetch } from '../utils/apiFetch';
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

      await Promise.all(
        picks.map(async (pick, idx) => {
          try {
            const params = new URLSearchParams({
              symbol: pick.id,
              type: pick.type,
              limit: String(Math.max(days, 30)),
            });
            const { data } = await apiFetch(
              `${API_BASE}/api/market?${params}`,
              { optional: true }
            );
            if (cancelled || !data?.history?.length) return;
            const sliced = data.history.slice(-days);
            next[pick.id] = {
              name: pick.name || pick.id,
              color: pick.color,
              points: normalizeSeries(sliced),
              idx,
            };
          } catch {
            /* skip asset */
          }
        })
      );

      if (!cancelled) {
        setSeriesById(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
