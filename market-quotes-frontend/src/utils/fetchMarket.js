import { API_BASE } from '../config/api';
import { apiFetch } from './apiFetch';
import { getMarketCache, marketCacheKey, setMarketCache } from './marketCache';

const inflight = new Map();
const historyBatchInflight = new Map();

function linkAbortSignal(parentSignal, childController) {
  if (!parentSignal) return () => {};
  if (parentSignal.aborted) {
    childController.abort();
    return () => {};
  }
  const onAbort = () => childController.abort();
  parentSignal.addEventListener('abort', onAbort);
  return () => parentSignal.removeEventListener('abort', onAbort);
}

export async function fetchMarket(symbol, type, { limit = 120, force = false } = {}) {
  const key = `${marketCacheKey(symbol, type)}:${limit}`;

  if (!force) {
    const cached = getMarketCache(symbol, type);
    if (cached?.quote?.price && cached.history?.length) {
      return { data: cached, fromCache: true, stale: Boolean(cached.stale) };
    }
  }

  if (!force && inflight.has(key)) {
    return inflight.get(key);
  }

  const url = `${API_BASE}/api/market?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}&limit=${limit}`;
  const promise = apiFetch(url)
    .then(({ data }) => {
      if (data) setMarketCache(symbol, type, data);
      inflight.delete(key);
      return { data, fromCache: false, stale: Boolean(data?.stale) };
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

export async function fetchHistoryBatch(picks, { limit = 90, signal } = {}) {
  if (!picks.length) return { results: [], apiDown: false };
  if (signal?.aborted) {
    return { results: [], apiDown: false, empty: true, timedOut: true, serverBusy: false };
  }

  const items = picks
    .map((p) => `${encodeURIComponent(p.type)}:${encodeURIComponent(p.id)}`)
    .join(',');
  const url = `${API_BASE}/api/history/batch?items=${items}&limit=${limit}`;

  if (historyBatchInflight.has(url)) {
    return historyBatchInflight.get(url);
  }

  async function attempt(timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const unlink = linkAbortSignal(signal, controller);
    try {
      const { data, ok, aborted, networkError, res, serverBusy } = await apiFetch(url, {
        optional: true,
        signal: controller.signal,
      });
      if (!ok) {
        return {
          results: [],
          apiDown: Boolean(networkError),
          empty: true,
          timedOut: Boolean(aborted),
          serverBusy: Boolean(serverBusy || (res && res.status >= 500 && !networkError)),
        };
      }
      return {
        results: data?.results ?? [],
        apiDown: false,
        empty: !data?.results?.length,
        timedOut: false,
        serverBusy: false,
      };
    } finally {
      clearTimeout(timer);
      unlink();
    }
  }

  const promise = (async () => {
    let out = await attempt(20_000);
    if (!out.apiDown && out.empty && !out.timedOut && !signal?.aborted) {
      await new Promise((r) => setTimeout(r, 600));
      out = await attempt(28_000);
    }
    return out;
  })().finally(() => historyBatchInflight.delete(url));

  historyBatchInflight.set(url, promise);
  return promise;
}

/** Fallback: storico singolo per asset via /api/history (usa cache mercato). */
export async function fetchHistoryPerPick(picks, { limit = 90, signal } = {}) {
  const rows = await Promise.all(
    picks.map(async (pick) => {
      if (signal?.aborted) return null;
      const url =
        `${API_BASE}/api/history?symbol=${encodeURIComponent(pick.id)}` +
        `&type=${encodeURIComponent(pick.type)}&limit=${limit}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 16_000);
      const unlink = linkAbortSignal(signal, controller);
      try {
        const { data, ok } = await apiFetch(url, {
          optional: true,
          signal: controller.signal,
        });
        if (ok && data?.history?.length) {
          return {
            symbol: pick.id,
            type: pick.type,
            history: data.history,
          };
        }
      } catch {
        /* skip symbol */
      } finally {
        clearTimeout(timer);
        unlink();
      }
      return null;
    })
  );
  return rows.filter(Boolean);
}

export async function fetchMarketBatch(picks, { limit = 120 } = {}) {
  if (!picks.length) return { results: [], fx: null };

  const uncached = [];
  const cachedResults = [];

  for (const pick of picks) {
    const cached = getMarketCache(pick.id, pick.type, { allowStale: true });
    if (cached?.history?.length) {
      cachedResults.push({
        symbol: pick.id,
        type: pick.type,
        history: cached.history,
        quote: cached.quote,
        cached: true,
        stale: Boolean(cached.stale),
      });
    } else {
      uncached.push(pick);
    }
  }

  if (!uncached.length) {
    return { results: cachedResults, fx: null, fromCache: true };
  }

  const items = uncached
    .map((p) => `${encodeURIComponent(p.type)}:${encodeURIComponent(p.id)}`)
    .join(',');
  const url = `${API_BASE}/api/market/batch?items=${items}&limit=${limit}`;

  const { data } = await apiFetch(url, { optional: true });
  if (!data?.results?.length) {
    return { results: cachedResults, fx: data?.fx ?? null, fromCache: cachedResults.length > 0 };
  }

  for (const row of data.results) {
    if (row?.symbol && row?.type) setMarketCache(row.symbol, row.type, row);
  }

  return {
    results: [...cachedResults, ...data.results],
    fx: data.fx ?? null,
    fromCache: false,
  };
}

const prefetchInflight = new Set();

export function prefetchMarket(symbol, type, { limit = 120 } = {}) {
  const key = marketCacheKey(symbol, type);
  if (getMarketCache(symbol, type)) return;
  if (prefetchInflight.has(key)) return;

  prefetchInflight.add(key);
  fetchMarket(symbol, type, { limit })
    .catch(() => {})
    .finally(() => prefetchInflight.delete(key));
}

export function prefetchMarkets(items, { limit = 120 } = {}) {
  items.slice(0, 3).forEach((item, index) => {
    if (!item?.id || !item?.type) return;
    window.setTimeout(() => prefetchMarket(item.id, item.type, { limit }), index * 500);
  });
}
