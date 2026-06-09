import { API_BASE } from '../config/api';
import { apiFetch } from './apiFetch';
import { getMarketCache, marketCacheKey, setMarketCache } from './marketCache';

const inflight = new Map();

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

export async function fetchBootstrap(symbol, type, { limit = 120 } = {}) {
  const params = new URLSearchParams({
    symbol,
    type,
    limit: String(limit),
  });
  const { data } = await apiFetch(`${API_BASE}/api/bootstrap?${params}`);
  if (data?.market) setMarketCache(symbol, type, data.market);
  return data;
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
  for (const item of items.slice(0, 8)) {
    if (item?.id && item?.type) prefetchMarket(item.id, item.type, { limit });
  }
}
