import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { analyzeFromMarket, analyzeMarket } from './lib/analyze.js';
import { getCache, getCacheEntry, refreshCache, setCache, hydrateCacheFromRedis } from './lib/cache.js';
import { buildForecastResponse } from './lib/forecastApi.js';
import { getEurUsdRate } from './lib/fx.js';
import { enrichQuoteWithEur } from './lib/quoteEnrich.js';
import { buildFullCatalog, buildSkeletonCatalog, fetchQuotesForSymbols } from './lib/quotesBatch.js';
import { buildGeopoliticalForecast } from './lib/geopolitical/combinedForecast.js';
import { fetchGeopoliticalNews } from './lib/geopolitical/newsFeed.js';
import { forecastWithGeopolitics } from './lib/geopolitical/geoForecast.js';
import { financialNlpSentiment } from './lib/geopolitical/nlpSentiment.js';
import { sentimentScore } from './lib/geopolitical/sentiment.js';
import { buildMarketIntelligence } from './lib/intelligence/buildIntelligence.js';
import { computeMarketCorrelations, correlationHeatmapCells } from './lib/market/correlations.js';
import { loadMarketData, toYahooSymbol } from './lib/yahoo.js';
import { fetchYahooChartDirect } from './lib/yahooChartDirect.js';
import { fetchBitcoinLiveSnapshot } from './lib/exchanges/bitcoin.js';
import { buildTradeAdvice } from './lib/trading/buildTradeAdvice.js';
import { CATEGORY_SOURCES } from './lib/sources/categorySources.js';
import { breakerSnapshot } from './lib/sources/circuitBreaker.js';
import { buildCommodityProfile } from './lib/commodity/buildProfile.js';
import { isMetalType, MARKET_TYPES } from './lib/marketType.js';
import { mountPortfolioRoutes } from './lib/portfolio/routes.js';
import { rateLimit, defaultCostFor } from './lib/rateLimit.js';
import { isLocalPiperAvailable, synthesizeLocalPiper } from './lib/localPiperTts.js';
import { mountGraphQL } from './lib/graphql/handler.js';
import { cacheHealth } from './lib/cacheStore.js';
import { logger, initObservability } from './lib/logger.js';
import { startPriceBridge } from './lib/wsPriceBridge.js';
import { runBacktest } from './lib/backtest/engine.js';
import { detectPriceAnomalies } from './lib/analytics/anomaly.js';
import { fetchFundamentals } from './lib/market/fundamentals.js';
import { fetchEconomicCalendar } from './lib/market/economicCalendar.js';
import { fetchSocialSentiment } from './lib/sentiment/socialFeed.js';
import { fetchBinanceOrderBook, toBinanceSymbol } from './lib/exchanges/binance.js';
import {
  createLimiter,
  createSingleFlight,
  mapPool,
  withTimeout,
} from './lib/concurrency.js';

// process.cwd(): ok in locale e su Netlify (niente import.meta — esbuild lo rompe).
dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });
initObservability();

const CACHE_TTL_MS = 10 * 60 * 1000;
const CATALOG_CACHE_MS = 2 * 60 * 1000;

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);
app.use(express.json());

app.use((req, res, next) => {
  if (req.path === '/api/health') {
    res.set('Cache-Control', 'public, max-age=60');
  } else if (req.path === '/api/catalog') {
    res.set('Cache-Control', 'public, max-age=120');
  } else if (req.path.startsWith('/api/correlations')) {
    res.set('Cache-Control', 'public, max-age=300');
  } else if (
    req.path === '/api/market' ||
    req.path === '/api/market/batch' ||
    req.path === '/api/bootstrap' ||
    req.path === '/api/quotes' ||
    req.path === '/api/history' ||
    req.path === '/api/ohlc'
  ) {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  } else if (req.path === '/api/analysis-bundle') {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }
  next();
});

// Rate limiting tier-based (anonymous/free/pro) con header standard.
// Peso maggiore sugli endpoint onerosi (chat, forecast, intelligence…).
app.use('/api', rateLimit({ scope: 'api', costFn: defaultCostFor }));

const marketLoadLimiter = createLimiter({
  name: 'market',
  max: Number(process.env.MAX_MARKET_LOADS) || 3,
  maxQueue: Number(process.env.MARKET_QUEUE_MAX) || 24,
  queueTimeoutMs: Number(process.env.MARKET_QUEUE_TIMEOUT_MS) || 15_000,
});

const historyBatchFlight = createSingleFlight();

/** Load shedding: risposta rapida 503 se la coda mercato è satura. */
app.use('/api', (req, res, next) => {
  if (req.path === '/api/health') return next();
  if (marketLoadLimiter.isOverloaded()) {
    res.set('Retry-After', '5');
    return res.status(503).json({
      error: 'Server temporaneamente occupato. Riprova tra qualche secondo.',
      degraded: true,
    });
  }
  return next();
});

/** Timeout globale per evitare richieste appese. */
app.use('/api', (req, res, next) => {
  const defaultMs = process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME ? 9_000 : 25_000;
  const ms = Number(process.env.REQUEST_TIMEOUT_MS) || defaultMs;
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Timeout richiesta API' });
    }
  }, ms);
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
});

const PORT = process.env.PORT || 4000;

// ── Helper di validazione/parsing condivisi tra le route ──────────────

const ALLOWED_FORECAST_METHODS = [
  'both',
  'sma',
  'linear',
  'log',
  'logreturn',
  'all',
  'arima',
  'lstm',
  'ml',
  'prophet',
  'commodity',
  'ensemble',
];

const MAX_QUOTES_SYMBOLS = 25;

/** Numero intero con default e limiti — sostituisce i clamp duplicati. */
function clampInt(value, fallback, min, max) {
  return Math.min(Math.max(Number(value) || fallback, min), max);
}

/** symbol trim+uppercase e type validato. Ritorna { symbol, type } o { error }. */
function parseMarketParams(req) {
  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  const type = String(req.query.type || 'stock').trim().toLowerCase();
  if (!symbol) return { error: 'Parametro "symbol" richiesto' };
  if (!MARKET_TYPES.includes(type)) {
    return { error: `Parametro "type" non valido. Ammessi: ${MARKET_TYPES.join(', ')}` };
  }
  return { symbol, type };
}

/** Method forecast normalizzato e validato. Ritorna { methods } o { error }. */
function parseForecastMethod(req, fallback = 'all') {
  const methods = String(req.query.method || fallback).toLowerCase();
  if (!ALLOWED_FORECAST_METHODS.includes(methods)) {
    return { error: `Parametro "method": ${ALLOWED_FORECAST_METHODS.join(' | ')}` };
  }
  return { methods };
}

function pricesFromSeries(series) {
  return series.map((p) => p.price);
}

function quoteFromSeries(series, symbol, extra = {}) {
  if (!series.length) return null;
  const last = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : null;
  const change = prev ? last.price - prev.price : null;
  const changePercent =
    prev && prev.price ? ((change / prev.price) * 100).toFixed(4) : null;
  const type = extra.type;
  const currency =
    extra.currency ||
    (type === 'national' ? 'EUR' : null) ||
    (String(symbol).toUpperCase().endsWith('.MI') ? 'EUR' : 'USD');

  return {
    symbol,
    price: last.price,
    currency,
    change,
    changePercent,
    asOf: last.date,
    source: 'yahoo-finance',
    ...extra,
  };
}

async function getCachedMarket(symbol, type, { minPoints = 0, allowStale = true } = {}) {
  const cacheKey = `market:${type}:${symbol.toUpperCase()}`;
  let entry = getCacheEntry(cacheKey);

  if (!entry) {
    try {
      const remote = await withTimeout(
        hydrateCacheFromRedis(cacheKey, CACHE_TTL_MS),
        Number(process.env.REDIS_HYDRATE_TIMEOUT_MS) || 800,
        'redis-hydrate'
      );
      if (remote?.series) entry = getCacheEntry(cacheKey);
    } catch {
      /* Redis lento o assente — continua senza bloccare */
    }
  }

  const cachedPoints = entry?.data?.series?.length ?? 0;
  const cacheUsable =
    entry?.data && (!minPoints || cachedPoints >= minPoints);

  if (cacheUsable && !entry.stale) {
    return { ...entry.data, fromCache: true, stale: false };
  }

  if (cacheUsable && entry.stale && allowStale) {
    if (!marketLoadLimiter.isOverloaded()) {
      refreshCache(cacheKey, () => loadMarketDataQueued(symbol, type), CACHE_TTL_MS).catch(
        () => {}
      );
    }
    return { ...entry.data, fromCache: true, stale: true };
  }

  const payload = await loadMarketDataQueued(symbol, type);
  setCache(cacheKey, payload, CACHE_TTL_MS);
  return { ...payload, fromCache: false, stale: false };
}

let catalogBuildFlight = null;
let lastCatalogForceRefreshAt = 0;
const CATALOG_FORCE_COOLDOWN_MS = 60_000;

const MARKET_LOAD_TIMEOUT_MS = Number(process.env.MARKET_LOAD_TIMEOUT_MS) || 14_000;

async function loadMarketDataQueued(symbol, type) {
  return marketLoadLimiter.run(() =>
    withTimeout(
      loadMarketData(symbol, type),
      MARKET_LOAD_TIMEOUT_MS,
      `market ${symbol}`
    )
  );
}

function historyRangeForLimit(limit) {
  if (limit <= 35) return '3mo';
  if (limit <= 95) return '6mo';
  return '1y';
}

const HISTORY_CHART_CACHE_MS = 5 * 60 * 1000;

function historyChartCacheKey(type, symbol, limit) {
  return `histchart:${type}:${symbol.toUpperCase()}:${limit}`;
}

async function loadHistoryChartRow({ symbol, type, limit, range, timeoutMs }) {
  const cacheKey = historyChartCacheKey(type, symbol, limit);
  const cached = getCacheEntry(cacheKey);
  if (cached?.data?.length) {
    return { symbol, type, history: cached.data, cached: true };
  }

  const marketKey = `market:${type}:${symbol.toUpperCase()}`;
  const marketCached = getCacheEntry(marketKey);
  if (marketCached?.data?.series?.length) {
    const history = marketCached.data.series
      .slice(-limit)
      .map((p) => ({ date: p.date, price: p.price }))
      .filter((p) => p.price != null);
    if (history.length) {
      setCache(cacheKey, history, HISTORY_CHART_CACHE_MS);
      return { symbol, type, history, cached: true };
    }
  }

  try {
    const yahooSymbol = toYahooSymbol(symbol, type);
    const { series } = await withTimeout(
      fetchYahooChartDirect(yahooSymbol, range, '1d', { fetchOnly: true }),
      timeoutMs,
      `chart ${symbol}`
    );
    const history = (series || [])
      .slice(-limit)
      .map((p) => ({ date: p.date, price: p.price }))
      .filter((p) => p.price != null);
    if (history.length) {
      setCache(cacheKey, history, HISTORY_CHART_CACHE_MS);
    }
    return { symbol, type, history, cached: false };
  } catch (err) {
    const stale = getCacheEntry(cacheKey);
    if (stale?.data?.length) {
      return { symbol, type, history: stale.data, cached: true, stale: true };
    }
    return { symbol, type, history: [], error: err.message };
  }
}

async function getOrBuildCatalog(req) {
  const forceRefresh = ['1', 'true', 'yes'].includes(
    String(req?.query?.refresh || '').toLowerCase()
  );

  const cached = getCache('full_catalog');
  if (cached && !forceRefresh) return { ...cached, cached: true };

  if (forceRefresh && Date.now() - lastCatalogForceRefreshAt < CATALOG_FORCE_COOLDOWN_MS) {
    return {
      ...(cached || buildSkeletonCatalog()),
      cached: Boolean(cached),
      partial: true,
      building: Boolean(catalogBuildFlight),
      message: 'Aggiornamento catalogo in cooldown — riprova tra un minuto.',
    };
  }

  if (forceRefresh && !catalogBuildFlight) {
    lastCatalogForceRefreshAt = Date.now();
    catalogBuildFlight = buildFullCatalog({ getCachedMarket, loadFx })
      .then((payload) => {
        setCache('full_catalog', payload, CATALOG_CACHE_MS);
        return { ...payload, cached: false };
      })
      .catch((err) => {
        console.warn('[catalog] refresh failed:', err.message);
        return null;
      })
      .finally(() => {
        catalogBuildFlight = null;
      });
  }

  if (forceRefresh && catalogBuildFlight) {
    return {
      ...buildSkeletonCatalog(),
      cached: false,
      partial: true,
      building: true,
      message: 'Aggiornamento catalogo in corso — i prezzi arriveranno a breve.',
    };
  }

  return {
    ...buildSkeletonCatalog(),
    cached: false,
    partial: true,
    message: 'Prezzi in caricamento — usa Aggiorna per quotazioni complete.',
  };
}

function buildMarketResponse(symbol, type, limit, { series, quote, meta, fromCache, stale }) {
  const maxPoints = Math.min(Math.max(Number(limit) || 90, 10), 120);
  const history = series.slice(-maxPoints);
  const baseQuote =
    quote ||
    quoteFromSeries(history, symbol, {
      provider: meta.provider,
      type,
      currency: quote?.currency,
    });

  return {
    symbol,
    type,
    ...meta,
    provider: meta.provider,
    sources: meta.sources ?? [],
    alternates: meta.alternates ?? [],
    quote: baseQuote,
    history,
    cached: fromCache,
    stale,
    info: meta.historyLimited
      ? 'Quotazione aggiornata (Stooq). Per lo storico completo aggiungi STOOQ_API_KEY in .env.'
      : `Dati da ${meta.provider || 'mercato'}${meta.alternates?.length ? ` (+${meta.alternates.length} fonti di confronto)` : ''}.`,
    warning:
      meta.historyLimited && !stale
        ? 'Storico limitato: aggiungi STOOQ_API_KEY (stooq.com) o riprova più tardi per Yahoo.'
        : undefined,
  };
}

function sendError(res, err, context) {
  console.error(`Errore ${context}:`, err.message);
  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.NETLIFY === 'true' ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const message = isProd ? 'Errore server' : err.message || 'Errore server';
  res.status(500).json({ error: message });
}

let fxCache = { value: null, at: 0 };
const FX_CACHE_MS = 60_000;

async function loadFx() {
  if (Date.now() - fxCache.at < FX_CACHE_MS) return fxCache.value;
  try {
    const value = await getEurUsdRate();
    fxCache = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.warn('Cambio EUR/USD non disponibile:', err.message);
    return fxCache.value;
  }
}

app.get('/api/health', (_req, res) => {
  const mem = process.memoryUsage();
  const marketStats = marketLoadLimiter.stats();
  res.json({
    ok: true,
    service: 'market-monitor-api',
    version: '2.0.0',
    runtime: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'netlify' : 'node',
    features: [
      'multi-source',
      'trade-advice',
      'analysis-bundle',
      'bootstrap',
      'market-batch',
      'portfolio',
      'watchlist',
      'pwa-push',
      'auth0-optional',
    ],
    degraded: marketStats.overloaded,
    queues: { market: marketStats },
    memoryMb: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    },
    uptimeSec: Math.round(process.uptime()),
  });
});

app.get('/api/sources', (_req, res) => {
  res.json({
    categories: CATEGORY_SOURCES,
    updatedAt: new Date().toISOString(),
  });
});

/** Stato dei circuit breaker per provider (diagnostica affidabilità fonti). */
app.get('/api/health/providers', (_req, res) => {
  const snapshot = breakerSnapshot();
  const openCount = snapshot.providers.filter((p) => p.state === 'open').length;
  res.json({
    ok: openCount === 0,
    ...snapshot,
    updatedAt: new Date().toISOString(),
  });
});

app.get('/api/health/ws', (_req, res) => {
  const stats = globalThis.__wsHub?.stats?.() ?? { clients: 0, channels: 0 };
  res.json({ ok: true, ...stats, updatedAt: new Date().toISOString() });
});

app.get('/api/health/redis', async (_req, res) => {
  try {
    const status = await cacheHealth();
    res.json({ ...status, updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/analytics/vitals', (req, res) => {
  logger.info('web-vital', req.body);
  res.status(204).end();
});

app.use('/graphql', rateLimit({ scope: 'graphql', cost: 3 }));
app.use('/graphql', (req, res, next) => {
  if (marketLoadLimiter.isOverloaded()) {
    res.set('Retry-After', '5');
    return res.status(503).json({
      error: 'Server temporaneamente occupato. Riprova tra qualche secondo.',
      degraded: true,
    });
  }
  return next();
});
app.use('/graphql', (req, res, next) => {
  const defaultMs =
    process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME ? 9_000 : 25_000;
  const ms = Number(process.env.REQUEST_TIMEOUT_MS) || defaultMs;
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Timeout richiesta GraphQL' });
    }
  }, ms);
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
});

mountGraphQL(app);

app.get('/api/catalog', async (req, res) => {
  try {
    const payload = await getOrBuildCatalog(req);
    res.json(payload);
  } catch (err) {
    sendError(res, err, '/api/catalog');
  }
});

/** Catalog + mercato corrente in un round-trip (meno latenza al primo paint). */
app.get('/api/bootstrap', async (req, res) => {
  try {
    const { symbol, type = 'stock', limit = 120 } = req.query;

    const [catalogPayload, marketPayload, fx] = await Promise.all([
      getOrBuildCatalog(req),
      symbol
        ? getCachedMarket(symbol, type).then((payload) =>
            buildMarketResponse(symbol, type, limit, payload)
          )
        : Promise.resolve(null),
      loadFx(),
    ]);

    if (marketPayload?.quote) {
      marketPayload.quote = enrichQuoteWithEur(marketPayload.quote, fx);
    }

    res.json({
      catalog: catalogPayload.catalog,
      summary: catalogPayload.summary,
      updatedAt: catalogPayload.updatedAt,
      catalogCached: catalogPayload.cached,
      market: marketPayload,
      fx,
    });
  } catch (err) {
    sendError(res, err, '/api/bootstrap');
  }
});

app.get('/api/fx', async (_req, res) => {
  try {
    const fx = await loadFx();
    if (!fx) {
      return res.status(503).json({ error: 'Cambio EUR/USD temporaneamente non disponibile' });
    }
    res.json(fx);
  } catch (err) {
    sendError(res, err, '/api/fx');
  }
});

app.get('/api/market', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });
    const limit = req.query.limit ?? 90;

    const payload = await getCachedMarket(symbol, type);
    const body = buildMarketResponse(symbol, type, limit, payload);
    const fx = await loadFx();
    res.json({
      ...body,
      fx,
      quote: enrichQuoteWithEur(body.quote, fx),
    });
  } catch (err) {
    sendError(res, err, '/api/market');
  }
});

/** Storici multi-asset in una richiesta (dashboard confronto). */
app.get('/api/market/batch', async (req, res) => {
  try {
    const raw = String(req.query.items || '').trim();
    if (!raw) {
      return res.status(400).json({ error: 'Parametro "items" richiesto (es. stock:AAPL,index:^GSPC)' });
    }

    const limit = req.query.limit ?? 120;
    const pairs = raw
      .split(',')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const sep = chunk.indexOf(':');
        if (sep === -1) return { type: 'stock', symbol: chunk };
        return {
          type: chunk.slice(0, sep).trim() || 'stock',
          symbol: chunk.slice(sep + 1).trim(),
        };
      })
      .filter((p) => p.symbol)
      .slice(0, 12);

    const fx = await loadFx();
    const BATCH_TIMEOUT_MS = Number(process.env.MARKET_BATCH_TIMEOUT_MS) || 12_000;
    const BATCH_CONCURRENCY = Number(process.env.MARKET_BATCH_CONCURRENCY) || 3;
    const results = await mapPool(
      pairs,
      async ({ symbol, type }) => {
        try {
          const payload = await Promise.race([
            getCachedMarket(symbol, type, { allowStale: true }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error(`Timeout ${symbol}`)), BATCH_TIMEOUT_MS);
            }),
          ]);
          const body = buildMarketResponse(symbol, type, limit, payload);
          return {
            ...body,
            quote: enrichQuoteWithEur(body.quote, fx),
          };
        } catch (err) {
          return {
            symbol,
            type,
            history: [],
            quote: null,
            error: err.message,
          };
        }
      },
      BATCH_CONCURRENCY
    );

    res.json({ results, fx });
  } catch (err) {
    sendError(res, err, '/api/market/batch');
  }
});

app.get('/api/quotes', async (req, res) => {
  try {
    const { symbols, type = 'stock' } = req.query;
    if (!symbols) {
      return res.status(400).json({ error: 'Parametro "symbols" richiesto' });
    }

    const list = symbols
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_QUOTES_SYMBOLS);
    const { results, fx } = await fetchQuotesForSymbols(list, type, {
      getCachedMarket,
      loadFx,
    });

    res.json({ symbols: list, type, fx, results });
  } catch (err) {
    sendError(res, err, '/api/quotes');
  }
});

app.get('/api/crypto/btc/live', async (_req, res) => {
  try {
    const fx = await loadFx();
    const snapshot = await fetchBitcoinLiveSnapshot();
    res.json({
      ...snapshot,
      fx,
      streams: {
        binance: 'wss://stream.binance.com/ws/btcusdt@ticker',
        kraken: 'wss://ws.kraken.com',
      },
    });
  } catch (err) {
    sendError(res, err, '/api/crypto/btc/live');
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });

    const maxPoints = clampInt(req.query.limit, 90, 10, 120);
    const range = historyRangeForLimit(maxPoints);
    const timeoutMs = Number(process.env.HISTORY_ROW_TIMEOUT_MS) || 12_000;
    const row = await loadHistoryChartRow({
      symbol,
      type,
      limit: maxPoints,
      range,
      timeoutMs,
    });
    const history = row.history || [];

    res.json({
      symbol,
      type,
      points: history.length,
      history,
      lastPrice: history[history.length - 1]?.price ?? null,
      cached: Boolean(row.cached),
      stale: Boolean(row.stale),
    });
  } catch (err) {
    sendError(res, err, '/api/history');
  }
});

/** Storici multi-asset paralleli (grafico performance) — Yahoo chart diretto, cache dedicata. */
app.get('/api/history/batch', async (req, res) => {
  try {
    const raw = String(req.query.items || '').trim();
    if (!raw) {
      return res.status(400).json({ error: 'Parametro "items" richiesto (es. index:^GSPC)' });
    }
    if (raw.length > 512) {
      return res.status(400).json({ error: 'Parametro items troppo lungo' });
    }

    const limit = clampInt(req.query.limit, 90, 10, 120);
    const range = historyRangeForLimit(limit);
    const timeoutMs = Number(process.env.HISTORY_BATCH_TIMEOUT_MS) || 12_000;

    const pairs = raw
      .split(',')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const sep = chunk.indexOf(':');
        if (sep === -1) return { type: 'stock', symbol: chunk };
        const type = chunk.slice(0, sep).trim() || 'stock';
        const symbol = chunk.slice(sep + 1).trim();
        if (!MARKET_TYPES.includes(type)) {
          throw new Error(`Tipo non valido: ${type}`);
        }
        return { type, symbol };
      })
      .filter((p) => p.symbol)
      .slice(0, 8);

    const flightKey = `${pairs.map((p) => `${p.type}:${p.symbol}`).join(',')}:${limit}`;
    const results = await historyBatchFlight(flightKey, () =>
      mapPool(
        pairs,
        (pair) => loadHistoryChartRow({ ...pair, limit, range, timeoutMs }),
        Number(process.env.HISTORY_BATCH_CONCURRENCY) || 1
      )
    );

    res.json({ results });
  } catch (err) {
    if (String(err.message).includes('Tipo non valido')) {
      return res.status(400).json({ error: err.message });
    }
    sendError(res, err, '/api/history/batch');
  }
});

const OHLC_RANGES = {
  '1d': '1d',
  '5d': '5d',
  '1mo': '1mo',
  '3mo': '3mo',
  '6mo': '6mo',
  '1y': '1y',
  '2y': '2y',
  '5y': '5y',
};

// Intervalli supportati (Yahoo). '1h' è alias di '60m'.
const OHLC_INTERVALS = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '60m': '60m',
  '1h': '60m',
  '1d': '1d',
  '1wk': '1wk',
};

// Range massimo consentito da Yahoo per gli intervalli intraday.
const INTRADAY_MAX_RANGE = {
  '1m': '5d',
  '5m': '1mo',
  '15m': '1mo',
  '30m': '1mo',
  '60m': '3mo',
};

const RANGE_ORDER = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y'];

function clampRangeForInterval(interval, range) {
  const max = INTRADAY_MAX_RANGE[interval];
  if (!max) return range;
  return RANGE_ORDER.indexOf(range) > RANGE_ORDER.indexOf(max) ? max : range;
}

/** Candele OHLC (candlestick TradingView-style), daily o intraday. Solo Yahoo. */
app.get('/api/ohlc', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });

    const interval = OHLC_INTERVALS[String(req.query.interval || '1d').toLowerCase()] || '1d';
    const rangeDefault = interval === '1d' ? '6mo' : '5d';
    let range = OHLC_RANGES[String(req.query.range || rangeDefault).toLowerCase()] || rangeDefault;
    range = clampRangeForInterval(interval, range);

    const cacheKey = `ohlc:${type}:${symbol}:${interval}:${range}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const yahooSymbol = toYahooSymbol(symbol, type);
    const chart = await fetchYahooChartDirect(yahooSymbol, range, interval);
    const candles = chart.ohlc ?? [];
    if (!candles.length) {
      return res
        .status(422)
        .json({ error: 'Candele non disponibili per questo asset', symbol, type });
    }

    // Cache più breve per l'intraday (dati vivi).
    const ttl = interval === '1d' || interval === '1wk' ? CACHE_TTL_MS : 60 * 1000;
    const body = {
      symbol,
      type,
      interval,
      range,
      yahooSymbol,
      currency: chart.meta?.currency || 'USD',
      points: candles.length,
      candles,
    };
    setCache(cacheKey, body, ttl);
    res.json({ ...body, cached: false });
  } catch (err) {
    sendError(res, err, '/api/ohlc');
  }
});

// ── Assistente AI ─────────────────────────────────────────────────────

// Codice lingua UI → nome lingua per istruire l'LLM multilingue.
const CHAT_LANG_NAMES = {
  it: 'italiano',
  en: 'inglese',
  es: 'spagnolo',
  fr: 'francese',
  de: 'tedesco',
  pt: 'portoghese',
};

function buildAssistantSystemPrompt(context = {}, lang = 'it') {
  const language = CHAT_LANG_NAMES[lang] || 'italiano';
  return (
    "Sei l'assistente di Market Monitor, app di quotazioni, analisi tecnica e previsioni ML " +
    'per investitori retail (focus Borsa Italiana e mercati internazionali). ' +
    `Rispondi SEMPRE in ${language}, in modo naturale, cordiale e umano. ` +
    'IMPORTANTE: sii BREVE e diretto — massimo 2-3 frasi, vai subito al punto, ' +
    'niente preamboli o ripetizioni. Aggiungi dettagli solo se esplicitamente richiesti. ' +
    'Fornisci SOLO informazioni educative: non dai consulenza finanziaria, non prometti ' +
    "rendimenti e ricordi che le decisioni sono responsabilità dell'utente. " +
    `Contesto utente: ${JSON.stringify(context).slice(0, 1500)}.`
  );
}

function fetchWithTimeout(url, options, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

/** Estrae la prima stringa non vuota da una risposta LLM di forma variabile. */
function extractReply(data) {
  const candidates = [
    data?.result,
    data?.response,
    data?.text,
    data?.message,
    data?.answer,
    data?.choices?.[0]?.message?.content,
    data?.choices?.[0]?.text,
    typeof data === 'string' ? data : null,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

/** Estrae il testo tradotto da una risposta traduttore di forma variabile. */
function extractTranslation(data) {
  const candidates = [
    data?.translated_text,
    data?.translatedText,
    data?.translation,
    data?.translations?.[0]?.text,
    data?.destination_text,
    data?.output,
    data?.result,
    data?.text,
    data?.data,
    typeof data === 'string' ? data : null,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

/**
 * Provider RapidAPI (default: LLaMA 3.3 70B Instruct Multilingual, OpenAI-compatibile).
 * Il body usa lo schema `chat/completions`; `web_access` viene aggiunto solo per ChatGPT-42.
 */
async function callRapidApiChat(messages, context, lang = 'it', systemOverride = null) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;
  const host =
    process.env.RAPIDAPI_CHAT_HOST ||
    'llama-3-3-70b-instruct-multilingual-chat-ai-by-meta.p.rapidapi.com';
  const pathName = process.env.RAPIDAPI_CHAT_PATH || '/chat/completions';
  const systemPrompt = systemOverride || buildAssistantSystemPrompt(context, lang);
  const turns = messages.slice(-10).map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: String(m.content || '').slice(0, 2000),
  }));

  // ChatGPT-42 (/conversationgpt4-2, /gpt4): niente ruolo "system" né "stream"
  // (mandano in timeout); la persona va nel campo dedicato system_prompt.
  const isChatGpt42 = host.includes('chatgpt-42');
  const body = isChatGpt42
    ? { messages: turns, system_prompt: systemPrompt, web_access: false }
    : {
        messages: [{ role: 'system', content: systemPrompt }, ...turns],
        temperature: 0.6,
        max_tokens: 700,
        stream: false,
      };
  const r = await fetchWithTimeout(
    `https://${host}${pathName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
      },
      body: JSON.stringify(body),
    },
    30000
  );
  if (!r.ok) throw new Error(`RapidAPI chat ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return extractReply(await r.json());
}

/** Provider OpenAI (fallback). */
async function callOpenAiChat(messages, context, lang = 'it', systemOverride = null) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const r = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemOverride || buildAssistantSystemPrompt(context, lang) },
        ...messages.slice(-10).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content || '').slice(0, 2000),
        })),
      ],
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return extractReply(await r.json());
}

/** Traduzione tramite il modello chat (usata se non c'è un traduttore dedicato). */
async function translateViaLLM(text, targetName) {
  const system = 'Sei un traduttore professionale. Rispondi SOLO con la traduzione, senza commenti.';
  const instruction =
    `Traduci il seguente testo in ${targetName}. Mantieni la formattazione markdown ` +
    `e i simboli/tickers invariati. Restituisci solo la traduzione:\n\n${text}`;
  const msg = [{ role: 'user', content: instruction }];
  try {
    const viaRapid = await callRapidApiChat(msg, {}, 'it', system);
    if (viaRapid) return viaRapid;
  } catch (e) {
    console.error('[translate:rapidapi]', e.message);
  }
  try {
    const viaOpenAi = await callOpenAiChat(msg, {}, 'it', system);
    if (viaOpenAi) return viaOpenAi;
  } catch (e) {
    console.error('[translate:openai]', e.message);
  }
  return null;
}

app.get('/api/chat/config', (_req, res) => {
  const provider = process.env.RAPIDAPI_KEY
    ? 'rapidapi'
    : process.env.OPENAI_API_KEY
      ? 'openai'
      : 'local';
  const hasDedicatedTranslator = Boolean(
    process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_TRANSLATE_HOST
  );
  const hasRapidTts = Boolean(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_TTS_HOST);
  const hasLocalTts = isLocalPiperAvailable();
  res.json({
    hasLLM: provider !== 'local',
    provider,
    hasTTS: hasRapidTts || hasLocalTts,
    hasLocalTTS: hasLocalTts,
    hasRapidTTS: hasRapidTts,
    // Traduzione disponibile con traduttore dedicato oppure via modello chat.
    hasTranslate: hasDedicatedTranslator || provider !== 'local',
  });
});

/**
 * Traduzione multilingue. Usa un traduttore RapidAPI dedicato se configurato
 * (RAPIDAPI_TRANSLATE_HOST), altrimenti ripiega sul modello chat.
 */
app.post('/api/translate', async (req, res) => {
  try {
    const text = String(req.body?.text || '').slice(0, 2000);
    const source = String(req.body?.source || 'Italian');
    const target = String(req.body?.target || '');
    if (!text || !target) {
      return res.status(400).json({ error: 'Parametri "text" e "target" richiesti' });
    }

    const key = process.env.RAPIDAPI_KEY;
    const host = process.env.RAPIDAPI_TRANSLATE_HOST;

    // 1) Traduttore dedicato su RapidAPI, se configurato.
    if (key && host) {
      const pathName = process.env.RAPIDAPI_TRANSLATE_PATH || '/translate.php';
      const r = await fetchWithTimeout(
        `https://${host}${pathName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-key': key,
            'x-rapidapi-host': host,
          },
          body: JSON.stringify({ text, source, target }),
        },
        15000
      );
      if (r.ok) {
        const ct = r.headers.get('content-type') || '';
        const translated = ct.includes('application/json')
          ? extractTranslation(await r.json())
          : (await r.text()).trim();
        if (translated) return res.json({ text: translated, source, target, via: 'translator' });
      } else {
        console.error('[translate:dedicated]', r.status);
      }
    }

    // 2) Fallback: traduzione tramite il modello chat (nessuna sottoscrizione extra).
    const viaLLM = await translateViaLLM(text, target);
    if (viaLLM) return res.json({ text: viaLLM, source, target, via: 'llm' });

    return res.status(400).json({ error: 'Traduttore non configurato' });
  } catch (err) {
    sendError(res, err, '/api/translate');
  }
});

/** Classifica l'errore del provider LLM per un messaggio utile lato client. */
function classifyChatError(message = '') {
  const m = String(message);
  if (/\b429\b|quota|rate.?limit|exceeded|too many/i.test(m)) return 'quota';
  if (/\b5\d{2}\b|timeout|abort|ENOTFOUND|ECONN|network|fetch failed/i.test(m)) return 'unavailable';
  return 'error';
}

app.post('/api/chat', async (req, res) => {
  const { messages = [], context = {}, lang = 'it' } = req.body || {};
  const configured = Boolean(process.env.RAPIDAPI_KEY || process.env.OPENAI_API_KEY);
  let lastError = null;
  try {
    // Priorità: RapidAPI → OpenAI → modalità base.
    if (process.env.RAPIDAPI_KEY) {
      try {
        const reply = await callRapidApiChat(messages, context, lang);
        if (reply) return res.json({ reply, provider: 'rapidapi' });
      } catch (e) {
        lastError = e.message;
        console.error('[chat:rapidapi]', e.message);
      }
    }
    if (process.env.OPENAI_API_KEY) {
      try {
        const reply = await callOpenAiChat(messages, context, lang);
        if (reply) return res.json({ reply, provider: 'openai' });
      } catch (e) {
        lastError = e.message;
        console.error('[chat:openai]', e.message);
      }
    }

    // Nessun provider configurato: invita a configurare la chiave.
    if (!configured) {
      return res.json({
        hasLLM: false,
        provider: 'local',
        configured: false,
        reply:
          'Assistente in modalità base: posso spiegare indicatori e aprire analisi/previsioni. ' +
          'Per risposte libere configura `RAPIDAPI_KEY` (ChatGPT-42) lato server.',
      });
    }

    // Provider configurato ma non disponibile (quota/errore): niente risposta
    // "canned" — il client mantiene la risposta locale utile e mostra una nota.
    const reason = classifyChatError(lastError);
    return res.json({
      hasLLM: true,
      provider: 'local',
      configured: true,
      fallback: true,
      reason,
      reply: null,
    });
  } catch (err) {
    sendError(res, err, '/api/chat');
  }
});

// Voci neurali Edge TTS per locale (il locale "nudo" non produce audio).
const EDGE_TTS_VOICES = {
  it: 'it-IT-ElsaNeural',
  'it-IT': 'it-IT-ElsaNeural',
  en: 'en-US-JennyNeural',
  'en-US': 'en-US-JennyNeural',
  es: 'es-ES-ElviraNeural',
  'es-ES': 'es-ES-ElviraNeural',
  fr: 'fr-FR-DeniseNeural',
  'fr-FR': 'fr-FR-DeniseNeural',
  de: 'de-DE-KatjaNeural',
  'de-DE': 'de-DE-KatjaNeural',
  pt: 'pt-PT-RaquelNeural',
  'pt-PT': 'pt-PT-RaquelNeural',
};

/** Se "voice" è un locale nudo (es. it-IT) lo mappa a una voce neurale valida. */
function resolveTtsVoice(voice) {
  if (/^[a-z]{2}(-[A-Z]{2})?$/.test(voice)) {
    return EDGE_TTS_VOICES[voice] || EDGE_TTS_VOICES[voice.slice(0, 2)] || voice;
  }
  return voice;
}

/** Text-to-Speech: Edge (RapidAPI) → Piper locale solo se Edge non configurato → 502 (fallback browser). */
app.post('/api/chat/tts', async (req, res) => {
  try {
    const text = String(req.body?.text || '').slice(0, 800);
    if (!text) return res.status(400).json({ error: 'Parametro "text" richiesto' });

    const rawVoice = String(req.body?.voice || process.env.RAPIDAPI_TTS_VOICE || 'it-IT');
    const voice = resolveTtsVoice(rawVoice);
    const key = process.env.RAPIDAPI_KEY;
    const host = process.env.RAPIDAPI_TTS_HOST;
    const rapidConfigured = Boolean(key && host);

    if (rapidConfigured) {
      const pathName = process.env.RAPIDAPI_TTS_PATH || '/';
      const textField = process.env.RAPIDAPI_TTS_TEXT_FIELD || 'text';
      const voiceField = process.env.RAPIDAPI_TTS_VOICE_FIELD || 'voice';
      const method = (process.env.RAPIDAPI_TTS_METHOD || 'POST').toUpperCase();

      let url = `https://${host}${pathName}`;
      const options = {
        method,
        headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
      };
      if (method === 'GET') {
        const qs = new URLSearchParams({ [textField]: text, [voiceField]: voice });
        url += (pathName.includes('?') ? '&' : '?') + qs.toString();
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({ [textField]: text, [voiceField]: voice });
      }

      const r = await fetchWithTimeout(url, options, 25000);

      if (r.status === 429) {
        return res.status(429).json({ error: 'Quota TTS Edge esaurita', code: 'EDGE_TTS_RATE_LIMIT' });
      }

      if (r.ok) {
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await r.json();
          const audioUrl =
            data?.url ||
            data?.audio_url ||
            data?.audioUrl ||
            data?.link ||
            data?.result?.url ||
            (typeof data?.result === 'string' && data.result.startsWith('http') ? data.result : null);
          if (audioUrl) return res.json({ audioUrl, source: 'rapidapi-edge' });
          const b64 = data?.audio || data?.audioContent || data?.base64;
          if (typeof b64 === 'string' && b64.length > 100) {
            const prefix = b64.startsWith('data:') ? '' : 'data:audio/mpeg;base64,';
            return res.json({ audio: `${prefix}${b64}`, source: 'rapidapi-edge' });
          }
        } else {
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length >= 200) {
            const mime = ct.startsWith('audio/') ? ct : 'audio/mpeg';
            return res.json({ audio: `data:${mime};base64,${buf.toString('base64')}`, source: 'rapidapi-edge' });
          }
        }
      }

      // Edge configurato ma fallito: il client usa la voce browser (no Piper in mezzo).
      return res.status(502).json({ error: 'TTS Edge non disponibile', code: 'EDGE_TTS_UNAVAILABLE' });
    }

    const localAudio = await synthesizeLocalPiper(text);
    if (localAudio) {
      return res.json({ audio: localAudio, source: 'piper-local' });
    }

    return res.status(502).json({ error: 'TTS non disponibile' });
  } catch (err) {
    sendError(res, err, '/api/chat/tts');
  }
});

app.get('/api/forecast', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });

    const horizonDays = clampInt(req.query.days, 5, 1, 30);
    const windowSize = clampInt(req.query.window, 5, 2, 60);
    const { methods, error: methodError } = parseForecastMethod(req, 'both');
    if (methodError) return res.status(400).json({ error: methodError });

    const needsMl = ['arima', 'lstm', 'ml', 'all', 'ensemble'].includes(methods);
    const minPoints = needsMl ? Math.max(windowSize, 30) : windowSize;

    const { series, meta, fromCache, stale } = await getCachedMarket(symbol, type, {
      minPoints,
    });
    const historicalPrices = pricesFromSeries(series);

    if (!historicalPrices.length) {
      return res.status(404).json({ error: 'Nessun dato storico disponibile' });
    }

    const effectiveWindow = Math.min(windowSize, historicalPrices.length);
    const needsSma = methods === 'both' || methods === 'sma' || methods === 'all';

    if (historicalPrices.length < 2) {
      return res.status(400).json({
        error: `Servono almeno 2 punti storici per una previsione. Disponibili: ${historicalPrices.length}.`,
        hint:
          'Aggiungi STOOQ_API_KEY in .env (gratis su stooq.com), attendi 1–2 minuti e riprova (Yahoo), oppure usa i metalli con FCSALE_API_KEY.',
      });
    }

    if (needsSma && effectiveWindow < 2) {
      return res.status(400).json({
        error: `Servono almeno 2 punti storici per la media mobile. Disponibili: ${historicalPrices.length}.`,
      });
    }

    const forecast = buildForecastResponse(historicalPrices, {
      windowSize: effectiveWindow,
      horizonDays,
      methods,
    });

    const includeGeo = ['1', 'true', 'yes'].includes(
      String(req.query.geo || req.query.geopolitical || '').toLowerCase()
    );

    let geopolitical = null;
    if (includeGeo) {
      geopolitical = await buildGeopoliticalForecast({
        symbol,
        type,
        series,
        prices: historicalPrices,
        windowSize: effectiveWindow,
        horizonDays,
        methods,
      });
    }

    const fx = await loadFx();

    res.json({
      symbol,
      type,
      ...meta,
      fx,
      ...forecast,
      geopolitical,
      historicalPoints: historicalPrices.length,
      windowUsed: effectiveWindow,
      windowRequested: windowSize,
      history: series.slice(-Math.min(series.length, 90)),
      cached: fromCache,
      stale,
      warning:
        effectiveWindow < windowSize
          ? `N ridotto da ${windowSize} a ${effectiveWindow} per i ${historicalPrices.length} giorni disponibili.`
          : undefined,
    });
  } catch (err) {
    sendError(res, err, '/api/forecast');
  }
});

app.get('/api/geopolitical/news', async (_req, res) => {
  try {
    const limit = clampInt(_req.query.limit, 40, 1, 80);
    const filterGeo = _req.query.filter !== 'false';
    const payload = await fetchGeopoliticalNews({ limit, filterGeo });
    res.json(payload);
  } catch (err) {
    sendError(res, err, '/api/geopolitical/news');
  }
});

app.post('/api/geopolitical/forecast', async (req, res) => {
  try {
    const { symbol, news: newsBody, baseForecastPrice } = req.body || {};
    const basePrice = Number(baseForecastPrice);
    if (!symbol || !Number.isFinite(basePrice)) {
      return res.status(400).json({
        error: 'Campi richiesti: symbol, baseForecastPrice (numerico); opzionale news[]',
      });
    }
    const news = (Array.isArray(newsBody) ? newsBody : []).slice(0, 100);
    const result = forecastWithGeopolitics(String(symbol).trim(), news, basePrice);
    res.json(result);
  } catch (err) {
    sendError(res, err, '/api/geopolitical/forecast');
  }
});

app.get('/api/geopolitical/forecast', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });

    const horizonDays = clampInt(req.query.days, 5, 1, 30);
    const windowSize = clampInt(req.query.window, 5, 2, 60);
    const { methods, error: methodError } = parseForecastMethod(req);
    if (methodError) return res.status(400).json({ error: methodError });

    const { series, meta, fromCache, stale } = await getCachedMarket(symbol, type, {
      minPoints: 2,
    });
    const prices = pricesFromSeries(series);
    if (prices.length < 2) {
      return res.status(400).json({ error: 'Dati storici insufficienti per previsione combinata' });
    }

    const effectiveWindow = Math.min(windowSize, prices.length);
    const geo = await buildGeopoliticalForecast({
      symbol,
      type,
      series,
      prices,
      windowSize: effectiveWindow,
      horizonDays,
      methods,
    });
    const fx = await loadFx();

    res.json({
      ...geo,
      ...meta,
      fx,
      cached: fromCache,
      stale,
      horizonDays,
      windowUsed: effectiveWindow,
    });
  } catch (err) {
    sendError(res, err, '/api/geopolitical/forecast');
  }
});

app.get('/api/geopolitical/sentiment', (req, res) => {
  const text = String(req.query.text || req.query.q || '').slice(0, 5000);
  if (!text) {
    return res.status(400).json({ error: 'Parametro "text" richiesto' });
  }
  res.json({
    basic: sentimentScore(text),
    advanced: financialNlpSentiment(text, { sourceId: req.query.source }),
  });
});

app.get('/api/commodities/profile', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    const type = String(req.query.type || 'commodity').trim().toLowerCase();
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }
    if (!isMetalType(type)) {
      return res.status(400).json({
        error: 'Profilo commodity per type=precious o type=commodity',
      });
    }

    const horizonDays = clampInt(req.query.days, 5, 1, 30);
    const windowSize = clampInt(req.query.window, 20, 2, 60);

    const cacheKey = `commodity:${type}:${symbol}:${horizonDays}:${windowSize}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const { series, quote, meta } = await getCachedMarket(symbol, type, {
      minPoints: Math.max(windowSize, 30),
    });

    const profile = await buildCommodityProfile({
      symbol,
      type,
      series,
      quote,
      windowSize,
      horizonDays,
    });

    const fx = await loadFx();
    const body = {
      ...profile,
      fx,
      provider: meta?.provider,
      cached: false,
    };
    setCache(cacheKey, body, CACHE_TTL_MS);
    res.json(body);
  } catch (err) {
    sendError(res, err, '/api/commodities/profile');
  }
});

app.get('/api/correlations', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase() || null;
    const type = String(req.query.type || 'stock').trim().toLowerCase();
    if (!MARKET_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Parametro "type" non valido. Ammessi: ${MARKET_TYPES.join(', ')}`,
      });
    }
    const cacheKey = `corr:${type}:${symbol || 'macro'}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const payload = await computeMarketCorrelations(
      symbol ? { symbol, type } : {}
    );
    const body = {
      ...payload,
      heatmap: correlationHeatmapCells(payload.pairs),
      cached: false,
    };
    setCache(cacheKey, body, CACHE_TTL_MS);
    res.json(body);
  } catch (err) {
    sendError(res, err, '/api/correlations');
  }
});

app.get('/api/backtest', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });
    const strategy = String(req.query.strategy || 'buy_hold').toLowerCase();
    const fast = clampInt(req.query.fast, 20, 5, 100);
    const slow = clampInt(req.query.slow, 50, 10, 200);
    const { series } = await getCachedMarket(symbol, type, { minPoints: 30 });
    const result = runBacktest(series, { strategy, fast, slow });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ symbol, type, ...result });
  } catch (err) {
    sendError(res, err, '/api/backtest');
  }
});

app.get('/api/anomalies', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });
    const { series } = await getCachedMarket(symbol, type, { minPoints: 10 });
    res.json({ symbol, type, anomalies: detectPriceAnomalies(series) });
  } catch (err) {
    sendError(res, err, '/api/anomalies');
  }
});

app.get('/api/fundamentals', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });
    const data = await fetchFundamentals(symbol, type);
    res.json(data);
  } catch (err) {
    sendError(res, err, '/api/fundamentals');
  }
});

app.get('/api/economic-calendar', async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 40, 5, 100);
    const payload = await fetchEconomicCalendar({ limit });
    res.json(payload);
  } catch (err) {
    sendError(res, err, '/api/economic-calendar');
  }
});

app.get('/api/sentiment/social', async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 20, 5, 50);
    const payload = await fetchSocialSentiment({ limit });
    res.json(payload);
  } catch (err) {
    sendError(res, err, '/api/sentiment/social');
  }
});

app.get('/api/orderbook', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || 'BTC-USD').trim();
    const type = String(req.query.type || 'crypto').toLowerCase();
    if (type !== 'crypto') {
      return res.status(400).json({ error: 'Order book disponibile solo per crypto' });
    }
    const limit = clampInt(req.query.limit, 15, 5, 50);
    const book = await fetchBinanceOrderBook(toBinanceSymbol(symbol), limit);
    res.json(book);
  } catch (err) {
    sendError(res, err, '/api/orderbook');
  }
});

app.get('/api/intelligence', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });

    const horizonDays = clampInt(req.query.days, 5, 1, 30);
    const windowSize = clampInt(req.query.window, 5, 2, 60);
    const { methods, error: methodError } = parseForecastMethod(req);
    if (methodError) return res.status(400).json({ error: methodError });

    const { series, meta, fromCache, stale } = await getCachedMarket(symbol, type, {
      minPoints: 2,
    });
    const prices = pricesFromSeries(series);
    if (prices.length < 2) {
      return res.status(400).json({ error: 'Dati storici insufficienti' });
    }

    const includeCorrelations = !['0', 'false', 'no'].includes(
      String(req.query.correlations ?? 'true').toLowerCase()
    );

    const intelligence = await buildMarketIntelligence({
      symbol,
      type,
      series,
      prices,
      windowSize: Math.min(windowSize, prices.length),
      horizonDays,
      methods,
      includeCorrelations,
    });

    const fx = await loadFx();

    res.json({
      ...intelligence,
      ...meta,
      anomalies: detectPriceAnomalies(series),
      fx,
      history: series.slice(-90),
      cached: fromCache,
      stale,
    });
  } catch (err) {
    sendError(res, err, '/api/intelligence');
  }
});

app.get('/api/analyze', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });

    const horizonDays = clampInt(req.query.days, 5, 1, 30);
    const analysis = await analyzeMarket(symbol, type, { horizonDays });
    const fx = await loadFx();

    res.json({
      ...analysis,
      fx,
      quote: enrichQuoteWithEur(analysis.quote, fx),
      horizonDays,
    });
  } catch (err) {
    sendError(res, err, '/api/analyze');
  }
});

/** Un round-trip: analyze + intelligence (geo incluso) — meno cold start su Netlify. */
app.get('/api/analysis-bundle', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });

    const horizonDays = clampInt(req.query.days, 5, 1, 30);
    const windowSize = clampInt(req.query.window, 5, 2, 60);
    const { methods, error: methodError } = parseForecastMethod(req);
    if (methodError) return res.status(400).json({ error: methodError });

    const marketPayload = await getCachedMarket(symbol, type, {
      minPoints: 2,
    });
    const { series, meta, fromCache, stale } = marketPayload;
    const prices = pricesFromSeries(series);

    const fx = await loadFx();

    const [analysis, intelligence] = await Promise.all([
      analyzeFromMarket(marketPayload, symbol, type, {
        horizonDays,
        skipExtraHistory: prices.length >= 14,
        skipLiveQuote: Boolean(marketPayload.quote?.price),
      }),
      prices.length >= 2
        ? buildMarketIntelligence({
            symbol,
            type,
            series,
            prices,
            windowSize: Math.min(windowSize, prices.length),
            horizonDays,
            methods,
            includeCorrelations: true,
          })
        : Promise.resolve(null),
    ]);

    res.json({
      analysis: {
        ...analysis,
        fx,
        quote: enrichQuoteWithEur(analysis.quote, fx),
        horizonDays,
      },
      intelligence: intelligence
        ? { ...intelligence, fx, history: series.slice(-90), cached: fromCache, stale }
        : null,
      meta,
      cached: fromCache,
      stale,
    });
  } catch (err) {
    sendError(res, err, '/api/analysis-bundle');
  }
});

const ADVICE_CACHE_MS = 5 * 60 * 1000;

app.get('/api/trade-advice', async (req, res) => {
  try {
    const { symbol, type, error } = parseMarketParams(req);
    if (error) return res.status(400).json({ error });

    const horizonDays = clampInt(req.query.days, 5, 1, 30);
    const windowSize = clampInt(req.query.window, 5, 2, 60);
    const { methods, error: methodError } = parseForecastMethod(req);
    if (methodError) return res.status(400).json({ error: methodError });
    const includeForecast = ['1', 'true', 'yes'].includes(
      String(req.query.forecast || req.query.includeForecast || '').toLowerCase()
    );

    const cacheKey = `advice:${type}:${symbol}:${horizonDays}:${includeForecast}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const marketPayload = await getCachedMarket(symbol, type, {
      minPoints: 2,
    });
    const { series, fromCache, stale } = marketPayload;
    const prices = pricesFromSeries(series);

    const [analysis, intelligence] = await Promise.all([
      analyzeFromMarket(marketPayload, symbol, type, {
        horizonDays,
        skipExtraHistory: prices.length >= 14,
        skipLiveQuote: Boolean(marketPayload.quote?.price),
      }),
      prices.length >= 2
        ? buildMarketIntelligence({
            symbol,
            type,
            series,
            prices,
            windowSize: Math.min(windowSize, prices.length),
            horizonDays,
            methods,
            includeCorrelations: true,
          })
        : Promise.resolve(null),
    ]);

    let forecastPayload = null;
    if (includeForecast && prices.length >= 2) {
      const effectiveWindow = Math.min(windowSize, prices.length);
      const baseForecast = buildForecastResponse(prices, {
        windowSize: effectiveWindow,
        horizonDays,
        methods,
      });
      try {
        const geo = await buildGeopoliticalForecast({
          symbol,
          type,
          series,
          prices,
          windowSize: effectiveWindow,
          horizonDays,
          methods,
        });
        forecastPayload = { ...baseForecast, ...geo, geopolitical: geo };
      } catch {
        forecastPayload = baseForecast;
      }
    }

    const fx = await loadFx();
    const advice = buildTradeAdvice({
      symbol,
      type,
      analysis: {
        ...analysis,
        quote: enrichQuoteWithEur(analysis.quote, fx),
      },
      intelligence,
      forecast: forecastPayload,
      horizonDays,
    });

    const body = {
      advice,
      analysis: {
        indicators: analysis.indicators,
        quote: enrichQuoteWithEur(analysis.quote, fx),
      },
      fx,
      hasForecast: Boolean(forecastPayload),
      cached: fromCache,
      stale,
    };

    setCache(cacheKey, body, ADVICE_CACHE_MS);
    res.json({ ...body, cached: false });
  } catch (err) {
    sendError(res, err, '/api/trade-advice');
  }
});

mountPortfolioRoutes(app, { getCachedMarket, loadFx });

app.use('/api', (req, res) => {
  res.status(404).json({
    error: `Endpoint non trovato: ${req.method} ${req.originalUrl}`,
    hint:
      'Controlla deploy Netlify (Functions) o avvia API locale (npm run dev:api). Route: /api/health, /api/market, /api/trade-advice, /api/analysis-bundle, /api/sources.',
  });
});

/** Rete di sicurezza: body JSON malformati e qualsiasi errore sfuggito ai try/catch. */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Body JSON non valido' });
  }
  console.error(`[unhandled] ${req.method} ${req.originalUrl}:`, err?.message || err);
  res.status(500).json({ error: 'Errore interno del server' });
});

export default app;

const isDirectRun =
  process.argv[1]?.includes('server.mjs') && !process.env.AWS_LAMBDA_FUNCTION_NAME;

if (isDirectRun) {
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err?.message || err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  });

  let portfolioCronInterval = null;
  let stopPriceBridge = null;
  let shuttingDown = false;

  const server = app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT} (Yahoo Finance)`);
    logger.info('server.started', { port: PORT });
  });

  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(
        `\n[api] Porta ${PORT} già in uso — processo API zombie o seconda istanza.\n` +
          `     Esegui: npm run dev:stop   poi: npm run dev\n`
      );
      process.exit(1);
    }
    console.error('[api] Errore listen:', err?.message || err);
    process.exit(1);
  });

  import('./lib/wsHub.js').then(({ attachWebSocketServer }) => {
    const wsHub = attachWebSocketServer(server);
    globalThis.__wsHub = wsHub;

    const enableWsBridge =
      process.env.ENABLE_WS_BRIDGE === 'true' ||
      process.env.NODE_ENV === 'production';
    if (enableWsBridge) {
      stopPriceBridge = startPriceBridge(wsHub, getCachedMarket);
    } else {
      console.log('[ws] Price bridge disabilitato in dev (ENABLE_WS_BRIDGE=true per attivarlo)');
    }
  });

  const warmChartSymbols = [
    { type: 'index', symbol: '^GSPC' },
    { type: 'index', symbol: '^IXIC' },
    { type: 'index', symbol: '^DJI' },
  ];
  if (process.env.WARM_CHART_HISTORY === '1') {
    setTimeout(() => {
      for (const pick of warmChartSymbols) {
        loadHistoryChartRow({
          symbol: pick.symbol,
          type: pick.type,
          limit: 90,
          range: historyRangeForLimit(90),
          timeoutMs: 12_000,
        }).catch(() => {});
      }
    }, 2000);
  }

  if (process.env.ENABLE_PORTFOLIO_CRON === 'true' && process.env.DATABASE_URL) {
    import('./lib/portfolio/monitor.js').then(({ runPortfolioMonitor }) => {
      const deps = { getCachedMarket, loadFx };
      const tick = () => {
        if (shuttingDown) return;
        runPortfolioMonitor(deps)
          .then((r) => {
            console.log('[portfolio-cron]', r);
          })
          .catch((err) => {
            console.error('[portfolio-cron]', err.message);
          });
      };
      portfolioCronInterval = setInterval(tick, 5 * 60 * 1000);
      console.log('Portfolio cron attivo (ogni 5 min)');
    });
  }

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] ${signal} — chiusura in corso…`);

    if (stopPriceBridge) stopPriceBridge();
    if (portfolioCronInterval) clearInterval(portfolioCronInterval);
    if (wsHub?.close) wsHub.close();

    server.close(() => {
      console.log('[shutdown] server chiuso');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[shutdown] timeout — uscita forzata');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\nPorta ${PORT} già in uso. Chiudi l'altro processo oppure esegui:\n  npm run dev:stop\n  npm run dev\n`
      );
      process.exit(1);
    }
    throw err;
  });
}
