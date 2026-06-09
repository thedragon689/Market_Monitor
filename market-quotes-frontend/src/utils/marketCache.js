const LS_KEY = 'market-monitor-market-v1';
const MAX_ENTRIES = 48;
const TTL_MS = 12 * 60 * 1000;
const STALE_MS = 60 * 60 * 1000;

const memory = new Map();

export function marketCacheKey(symbol, type) {
  return `${type}:${String(symbol).trim().toUpperCase()}`;
}

function pruneMap(map) {
  if (map.size <= MAX_ENTRIES) return map;
  const sorted = [...map.entries()].sort((a, b) => a[1].storedAt - b[1].storedAt);
  const next = new Map(sorted.slice(-MAX_ENTRIES));
  return next;
}

function readStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    const keys = Object.keys(store);
    if (keys.length > MAX_ENTRIES) {
      const sorted = keys.sort((a, b) => (store[a].storedAt ?? 0) - (store[b].storedAt ?? 0));
      for (const key of sorted.slice(0, keys.length - MAX_ENTRIES)) {
        delete store[key];
      }
    }
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

function normalizeEntry(data) {
  if (!data) return null;
  return {
    quote: data.quote ?? null,
    history: data.history ?? [],
    provider: data.provider,
    sources: data.sources,
    alternates: data.alternates,
    proxy: data.proxy,
    fx: data.fx,
    warning: data.warning,
    info: data.info,
    cached: data.cached,
    stale: data.stale,
  };
}

export function getMarketCache(symbol, type, { allowStale = true } = {}) {
  const key = marketCacheKey(symbol, type);
  const mem = memory.get(key);
  if (mem) {
    const age = Date.now() - mem.storedAt;
    if (age <= TTL_MS) return mem.data;
    if (allowStale && age <= STALE_MS) return { ...mem.data, stale: true };
  }

  const store = readStore();
  const row = store[key];
  if (!row) return null;
  const age = Date.now() - row.storedAt;
  if (age > STALE_MS) {
    delete store[key];
    writeStore(store);
    return null;
  }
  const data = normalizeEntry(row.data);
  memory.set(key, { data, storedAt: row.storedAt });
  if (age <= TTL_MS) return data;
  return allowStale ? { ...data, stale: true } : null;
}

export function setMarketCache(symbol, type, payload) {
  if (!payload) return;
  const key = marketCacheKey(symbol, type);
  const data = normalizeEntry(payload);
  const storedAt = Date.now();
  memory.set(key, { data, storedAt });

  const store = readStore();
  store[key] = { data, storedAt };
  writeStore(store);
}

export function peekMarketCache(symbol, type) {
  return getMarketCache(symbol, type, { allowStale: true });
}

export function quoteFromCatalog(catalog, symbol, type) {
  if (!catalog) return null;
  const id = String(symbol).trim().toUpperCase();
  const item = (catalog[type] || []).find((row) => row.id?.toUpperCase() === id);
  return item?.quote ?? null;
}

export function prefetchKeys(symbols, type) {
  return symbols.map((sym) => marketCacheKey(sym, type));
}
