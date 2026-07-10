import { useEffect, useState } from 'react';
import { fetchHistoryBatch, fetchHistoryPerPick } from '../utils/fetchMarket';
import { getMarketCache } from '../utils/marketCache';
import { getTimeframeDays } from '../data/chartTimeframes';

const CACHE_PREFIX = 'mm:compare-hist:';
const CACHE_MS = 5 * 60 * 1000;

function seriesKey(pick, idx) {
  return `s${idx}`;
}

function normalizeSeries(history) {
  if (!history?.length) return [];
  const base = history[0].price;
  if (!base) return [];
  return history.map((p) => ({
    date: p.date,
    pct: Number((((p.price / base - 1) * 100).toFixed(3))),
  }));
}

function isValidSeriesMap(seriesById) {
  if (!seriesById || !Object.keys(seriesById).length) return false;
  return Object.values(seriesById).some((s) => s.points?.length >= 2);
}

function readCache(pickKey, timeframeId) {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${pickKey}:${timeframeId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.at || Date.now() - parsed.at > CACHE_MS) return null;
    const seriesById = parsed.seriesById ?? null;
    return isValidSeriesMap(seriesById) ? seriesById : null;
  } catch {
    return null;
  }
}

function writeCache(pickKey, timeframeId, seriesById) {
  if (!isValidSeriesMap(seriesById)) return;
  try {
    sessionStorage.setItem(
      `${CACHE_PREFIX}${pickKey}:${timeframeId}`,
      JSON.stringify({ at: Date.now(), seriesById })
    );
  } catch {
    /* quota */
  }
}

function buildSeriesFromPicks(picks, days) {
  const next = {};
  picks.forEach((pick, idx) => {
    const cached = getMarketCache(pick.id, pick.type, { allowStale: true });
    if (!cached?.history?.length) return;
    const sliced = cached.history.slice(-days);
    const points = normalizeSeries(sliced);
    if (points.length < 2) return;
    const key = seriesKey(pick, idx);
    next[key] = {
      symbol: pick.id,
      name: pick.name || pick.id,
      color: pick.color,
      points,
      idx,
    };
  });
  return next;
}

function mergeBatchResults(picks, results, days) {
  const next = {};
  results.forEach((row) => {
    const pickIdx = picks.findIndex(
      (p) => p.id.toUpperCase() === String(row.symbol).toUpperCase()
    );
    const pick = pickIdx >= 0 ? picks[pickIdx] : null;
    if (!row?.history?.length || !pick) return;
    const sliced = row.history.slice(-days);
    const points = normalizeSeries(sliced);
    if (points.length < 2) return;
    const key = seriesKey(pick, pickIdx);
    next[key] = {
      symbol: pick.id,
      name: pick.name || pick.id,
      color: pick.color,
      points,
      idx: pickIdx,
    };
  });
  return next;
}

async function resolveCompareHistories(picks, days, signal) {
  const limit = Math.max(days, 30);

  const batch = await fetchHistoryBatch(picks, { limit, signal });
  let next = mergeBatchResults(picks, batch.results ?? [], days);
  if (isValidSeriesMap(next)) {
    return {
      next,
      apiDown: batch.apiDown,
      rateLimited: false,
      timedOut: false,
      serverBusy: false,
      partial: Object.keys(next).length < picks.length,
    };
  }

  const perPick = await fetchHistoryPerPick(picks, { limit, signal });
  next = mergeBatchResults(picks, perPick, days);
  if (isValidSeriesMap(next)) {
    return {
      next,
      apiDown: false,
      rateLimited: false,
      timedOut: false,
      serverBusy: false,
      partial: Object.keys(next).length < picks.length,
    };
  }

  next = buildSeriesFromPicks(picks, days);
  return {
    next,
    apiDown: batch.apiDown,
    timedOut: batch.timedOut,
    serverBusy: batch.serverBusy,
    rateLimited: !batch.apiDown && batch.empty && !isValidSeriesMap(next),
    partial: false,
  };
}

/** Carica storici multi-asset e li normalizza a % performance. */
export function useCompareHistories(picks, timeframeId) {
  const pickKey = picks.map((p) => `${p.type}:${p.id}`).join('|');

  const [seriesById, setSeriesById] = useState(() => readCache(pickKey, timeframeId) ?? {});
  const [loading, setLoading] = useState(() => picks.length > 0 && !readCache(pickKey, timeframeId));
  const [error, setError] = useState(null);
  const [partial, setPartial] = useState(false);

  useEffect(() => {
    if (!picks.length) {
      setSeriesById({});
      setError(null);
      setPartial(false);
      setLoading(false);
      return undefined;
    }

    const cached = readCache(pickKey, timeframeId);
    if (cached) {
      setSeriesById(cached);
      setError(null);
      setPartial(false);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const abort = new AbortController();
    const days = getTimeframeDays(timeframeId);

    (async () => {
      setLoading(true);
      setError(null);
      setPartial(false);

      try {
        const result = await resolveCompareHistories(picks, days, abort.signal);
        if (cancelled || abort.signal.aborted) return;

        const { next, apiDown, rateLimited, timedOut, serverBusy, partial: isPartial } = result;

        if (isValidSeriesMap(next)) {
          writeCache(pickKey, timeframeId, next);
          setSeriesById(next);
          setPartial(Boolean(isPartial));
          setError(
            isPartial ? 'Alcuni asset non hanno storico disponibile — grafico parziale.' : null
          );
        } else {
          setSeriesById({});
          setError(
            apiDown
              ? 'API non raggiungibile — avvia il server con npm run dev.'
              : timedOut || serverBusy
                ? 'API lenta o sovraccarica — riprova tra poco.'
                : rateLimited
                  ? 'Yahoo in limitazione temporanea — attendi 1-2 minuti e ricarica.'
                  : 'Storici non disponibili — riprova tra poco.'
          );
        }
      } catch (err) {
        if (!cancelled && !abort.signal.aborted) {
          const fallback = buildSeriesFromPicks(picks, days);
          if (isValidSeriesMap(fallback)) {
            setSeriesById(fallback);
            setError(null);
            setPartial(true);
          } else {
            setError(err.message || 'Errore caricamento performance');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [pickKey, timeframeId, picks.length]);

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

  return { seriesById, chartData, loading, error, partial };
}
