/** Cache TTL in-memory (toolkit Yahoo §0). */
const cache = new Map();

export function setCache(key, data, ttlMs) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

export function clearCache(key) {
  if (key) cache.delete(key);
  else cache.clear();
}
