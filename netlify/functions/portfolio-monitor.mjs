/**
 * Netlify Scheduled Function — monitor portfolio ogni 5 minuti.
 * Configurato in netlify.toml con schedule ogni 5 minuti (cron)
 */
import path from 'path';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

async function loadMonitor() {
  const dbPath = path.join(process.cwd(), 'lib', 'db.js');
  const monitorPath = path.join(process.cwd(), 'lib', 'portfolio', 'monitor.js');

  const { ensureSchema } = await import(pathToFileURL(dbPath).href);
  await ensureSchema();

  const { runPortfolioMonitor } = await import(pathToFileURL(monitorPath).href);

  const yahooPath = path.join(process.cwd(), 'lib', 'yahoo.js');
  const cachePath = path.join(process.cwd(), 'lib', 'cache.js');
  const fxPath = path.join(process.cwd(), 'lib', 'fx.js');
  const { loadMarketData } = await import(pathToFileURL(yahooPath).href);
  const { getCache, setCache } = await import(pathToFileURL(cachePath).href);
  const { getEurUsdRate } = await import(pathToFileURL(fxPath).href);

  const CACHE_TTL_MS = 10 * 60 * 1000;

  async function getCachedMarket(symbol, type, { minPoints = 0, allowStale = true } = {}) {
    const key = `market:${type}:${String(symbol).toUpperCase()}`;
    const cached = getCache(key);
    if (cached) return cached;
    const data = await loadMarketData(symbol, type, { minPoints });
    setCache(key, data, CACHE_TTL_MS);
    return data;
  }

  async function loadFx() {
    return { eurUsd: await getEurUsdRate() };
  }

  return runPortfolioMonitor({ getCachedMarket, loadFx });
}

export const handler = async () => {
  try {
    const result = await loadMonitor();
    console.log('[portfolio-monitor]', JSON.stringify(result));
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...result }) };
  } catch (err) {
    console.error('[portfolio-monitor] error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export const config = {
  schedule: '*/5 * * * *',
};
