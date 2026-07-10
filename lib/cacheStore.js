/**
 * Cache store con fallback in-memory (Prompt 6).
 * Se REDIS_URL è impostato e ioredis è installato, usa Redis; altrimenti Map locale.
 */
import * as memory from './cache.js';

let redisClient = null;
let redisReady = false;

async function getRedis() {
  if (redisClient !== null) return redisClient;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    redisClient = false;
    return null;
  }
  try {
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redisClient.connect();
    redisReady = true;
    return redisClient;
  } catch (err) {
    console.warn('[cache] Redis non disponibile, uso in-memory:', err.message);
    redisClient = false;
    return null;
  }
}

export async function cacheGet(key) {
  const r = await getRedis();
  if (r) {
    try {
      const raw = await r.get(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.expires && Date.now() > parsed.expires) {
        await r.del(key);
        return null;
      }
      return parsed.data;
    } catch {
      return memory.getCache(key);
    }
  }
  return memory.getCache(key);
}

export async function cacheSet(key, data, ttlMs) {
  const r = await getRedis();
  if (!r) return;
  try {
    const payload = JSON.stringify({ data, expires: Date.now() + ttlMs });
    await r.set(key, payload, 'PX', ttlMs);
  } catch {
    /* mirror Redis opzionale — la cache in-memory è già aggiornata dal chiamante */
  }
}

export function isRedisActive() {
  return redisReady;
}

export async function cacheHealth() {
  const r = await getRedis();
  if (!r) return { ok: true, backend: 'memory' };
  try {
    await r.ping();
    return { ok: true, backend: 'redis' };
  } catch (err) {
    return { ok: false, backend: 'redis', error: err.message };
  }
}
