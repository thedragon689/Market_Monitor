/** Cache TTL in-memory con supporto stale-while-revalidate. */
const cache = new Map();
const inflightRefresh = new Map();

/** Quanto tempo tenere dati scaduti prima di eliminarli. */
export const STALE_GRACE_MS = 60 * 60 * 1000;

export function setCache(key, data, ttlMs) {
  cache.set(key, { data, expires: Date.now() + ttlMs, storedAt: Date.now() });
}

export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires + STALE_GRACE_MS) {
    cache.delete(key);
    return null;
  }
  if (Date.now() > item.expires) return null;
  return item.data;
}

/** Ritorna dati anche se scaduti (entro STALE_GRACE_MS). */
export function getCacheEntry(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires + STALE_GRACE_MS) {
    cache.delete(key);
    return null;
  }
  return {
    data: item.data,
    stale: Date.now() > item.expires,
    expires: item.expires,
  };
}

export function clearCache(key) {
  if (key) cache.delete(key);
  else cache.clear();
}

/** Aggiorna in background senza duplicare richieste parallele. */
export function refreshCache(key, loader, ttlMs) {
  if (inflightRefresh.has(key)) return inflightRefresh.get(key);

  const promise = Promise.resolve()
    .then(loader)
    .then((data) => {
      setCache(key, data, ttlMs);
      inflightRefresh.delete(key);
      return data;
    })
    .catch((err) => {
      inflightRefresh.delete(key);
      throw err;
    });

  inflightRefresh.set(key, promise);
  return promise;
}
