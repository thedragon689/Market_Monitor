/** Cache TTL in-memory con mirror opzionale su Redis (cacheStore). */
import { cacheSet as redisSet, cacheGet as redisGet } from './cacheStore.js';

const cache = new Map();
const inflightRefresh = new Map();

/** Quanto tempo tenere dati scaduti prima di eliminarli. */
export const STALE_GRACE_MS = 60 * 60 * 1000;

/** Limite voci: evita crescita illimitata con simboli arbitrari. */
const MAX_CACHE_ENTRIES = 500;

function evictIfNeeded() {
  if (cache.size < MAX_CACHE_ENTRIES) return;
  // Map preserva l'ordine di inserimento: elimina le voci più vecchie.
  const toDrop = Math.ceil(MAX_CACHE_ENTRIES * 0.1);
  let dropped = 0;
  for (const key of cache.keys()) {
    cache.delete(key);
    dropped += 1;
    if (dropped >= toDrop) break;
  }
}

export function setCache(key, data, ttlMs) {
  evictIfNeeded();
  cache.set(key, { data, expires: Date.now() + ttlMs, storedAt: Date.now() });
  redisSet(key, data, ttlMs).catch(() => {});
}

export async function hydrateCacheFromRedis(key, ttlMs) {
  const remote = await redisGet(key);
  if (!remote) return null;
  setCache(key, remote, ttlMs);
  return remote;
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
