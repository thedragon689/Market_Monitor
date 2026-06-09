import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { analyzeFromMarket, analyzeMarket } from './lib/analyze.js';
import { getCache, getCacheEntry, refreshCache, setCache } from './lib/cache.js';
import { buildForecastResponse } from './lib/forecastApi.js';
import { getEurUsdRate } from './lib/fx.js';
import { enrichQuoteWithEur } from './lib/quoteEnrich.js';
import { buildFullCatalog, fetchQuotesForSymbols } from './lib/quotesBatch.js';
import { buildGeopoliticalForecast } from './lib/geopolitical/combinedForecast.js';
import { fetchGeopoliticalNews } from './lib/geopolitical/newsFeed.js';
import { forecastWithGeopolitics } from './lib/geopolitical/geoForecast.js';
import { financialNlpSentiment } from './lib/geopolitical/nlpSentiment.js';
import { sentimentScore } from './lib/geopolitical/sentiment.js';
import { buildMarketIntelligence } from './lib/intelligence/buildIntelligence.js';
import { computeMarketCorrelations, correlationHeatmapCells } from './lib/market/correlations.js';
import { loadMarketData } from './lib/yahoo.js';
import { fetchBitcoinLiveSnapshot } from './lib/exchanges/bitcoin.js';
import { buildTradeAdvice } from './lib/trading/buildTradeAdvice.js';
import { CATEGORY_SOURCES } from './lib/sources/categorySources.js';
import { buildCommodityProfile } from './lib/commodity/buildProfile.js';
import { isMetalType } from './lib/marketType.js';

// process.cwd(): ok in locale e su Netlify (niente import.meta — esbuild lo rompe).
dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

const CACHE_TTL_MS = 10 * 60 * 1000;
const CATALOG_CACHE_MS = 2 * 60 * 1000;

const app = express();
app.use(cors());
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
    req.path === '/api/history'
  ) {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  } else if (req.path === '/api/analysis-bundle') {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }
  next();
});

const PORT = process.env.PORT || 4000;

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
  const entry = getCacheEntry(cacheKey);
  const cachedPoints = entry?.data?.series?.length ?? 0;
  const cacheUsable =
    entry?.data && (!minPoints || cachedPoints >= minPoints);

  if (cacheUsable && !entry.stale) {
    return { ...entry.data, fromCache: true, stale: false };
  }

  if (cacheUsable && entry.stale && allowStale) {
    refreshCache(cacheKey, () => loadMarketData(symbol, type), CACHE_TTL_MS).catch(
      () => {}
    );
    return { ...entry.data, fromCache: true, stale: true };
  }

  const payload = await loadMarketData(symbol, type);
  setCache(cacheKey, payload, CACHE_TTL_MS);
  return { ...payload, fromCache: false, stale: false };
}

async function getOrBuildCatalog() {
  const cached = getCache('full_catalog');
  if (cached) return { ...cached, cached: true };

  const payload = await buildFullCatalog({
    getCachedMarket,
    loadFx,
  });
  setCache('full_catalog', payload, CATALOG_CACHE_MS);
  return { ...payload, cached: false };
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
  res.status(500).json({ error: err.message || 'Errore server' });
}

async function loadFx() {
  try {
    return await getEurUsdRate();
  } catch (err) {
    console.warn('Cambio EUR/USD non disponibile:', err.message);
    return null;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'market-monitor-api',
    version: '1.2.0',
    runtime: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'netlify' : 'node',
    features: ['multi-source', 'trade-advice', 'analysis-bundle', 'bootstrap', 'market-batch'],
  });
});

app.get('/api/sources', (_req, res) => {
  res.json({
    categories: CATEGORY_SOURCES,
    updatedAt: new Date().toISOString(),
  });
});

app.get('/api/catalog', async (_req, res) => {
  try {
    const payload = await getOrBuildCatalog();
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
      getOrBuildCatalog(),
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
    const { symbol, type = 'stock', limit = 90 } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }

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
    const results = await Promise.all(
      pairs.map(async ({ symbol, type }) => {
        const payload = await getCachedMarket(symbol, type);
        const body = buildMarketResponse(symbol, type, limit, payload);
        return {
          ...body,
          quote: enrichQuoteWithEur(body.quote, fx),
        };
      })
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

    const list = symbols.split(',').map((s) => s.trim()).filter(Boolean);
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
        binance: 'wss://stream.binance.com:9443/ws/btcusdt@ticker',
        kraken: 'wss://ws.kraken.com',
      },
    });
  } catch (err) {
    sendError(res, err, '/api/crypto/btc/live');
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const { symbol, type = 'stock', limit = 90 } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }

    const maxPoints = Math.min(Math.max(Number(limit) || 90, 10), 120);
    const { series, meta, fromCache, stale } = await getCachedMarket(symbol, type);
    const history = series.slice(-maxPoints);

    res.json({
      symbol,
      type,
      ...meta,
      points: history.length,
      history,
      lastPrice: history[history.length - 1]?.price ?? null,
      cached: fromCache,
      stale,
    });
  } catch (err) {
    sendError(res, err, '/api/history');
  }
});

app.get('/api/forecast', async (req, res) => {
  try {
    const {
      symbol,
      type = 'stock',
      days = 5,
      window = 5,
      method = 'both',
    } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }

    const horizonDays = Math.min(Math.max(Number(days) || 5, 1), 30);
    const windowSize = Math.min(Math.max(Number(window) || 5, 2), 60);
    const methods = String(method).toLowerCase();
    const allowedMethods = [
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
    ];
    if (!allowedMethods.includes(methods)) {
      return res.status(400).json({
        error:
          'Parametro "method": sma | linear | log | both | all | arima | lstm | ml | prophet | commodity',
      });
    }

    const needsMl = ['arima', 'lstm', 'ml', 'all'].includes(methods);
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
    const limit = Math.min(Number(_req.query.limit) || 40, 80);
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
    if (!symbol || baseForecastPrice == null) {
      return res.status(400).json({
        error: 'Campi richiesti: symbol, baseForecastPrice; opzionale news[]',
      });
    }
    const news = Array.isArray(newsBody) ? newsBody : [];
    const result = forecastWithGeopolitics(symbol, news, Number(baseForecastPrice));
    res.json(result);
  } catch (err) {
    sendError(res, err, '/api/geopolitical/forecast');
  }
});

app.get('/api/geopolitical/forecast', async (req, res) => {
  try {
    const {
      symbol,
      type = 'stock',
      days = 5,
      window = 5,
      method = 'all',
    } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }

    const horizonDays = Math.min(Math.max(Number(days) || 5, 1), 30);
    const windowSize = Math.min(Math.max(Number(window) || 5, 2), 60);
    const methods = String(method).toLowerCase();

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
  const text = req.query.text || req.query.q || '';
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
    const {
      symbol,
      type = 'commodity',
      days = 5,
      window = 20,
    } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }
    if (!isMetalType(type)) {
      return res.status(400).json({
        error: 'Profilo commodity per type=precious o type=commodity',
      });
    }

    const horizonDays = Math.min(Math.max(Number(days) || 5, 1), 30);
    const windowSize = Math.min(Math.max(Number(window) || 20, 2), 60);

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
    const { symbol, type = 'stock' } = req.query;
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

app.get('/api/intelligence', async (req, res) => {
  try {
    const {
      symbol,
      type = 'stock',
      days = 5,
      window = 5,
      method = 'all',
    } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }

    const horizonDays = Math.min(Math.max(Number(days) || 5, 1), 30);
    const windowSize = Math.min(Math.max(Number(window) || 5, 2), 60);
    const methods = String(method).toLowerCase();

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
    const { symbol, type = 'stock', days = 5 } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }

    const horizonDays = Math.min(Math.max(Number(days) || 5, 1), 30);
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
    const {
      symbol,
      type = 'stock',
      days = 5,
      window = 5,
      method = 'all',
    } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }

    const horizonDays = Math.min(Math.max(Number(days) || 5, 1), 30);
    const windowSize = Math.min(Math.max(Number(window) || 5, 2), 60);
    const methods = String(method).toLowerCase();

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
    const {
      symbol,
      type = 'stock',
      days = 5,
      window = 5,
      method = 'all',
    } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Parametro "symbol" richiesto' });
    }

    const horizonDays = Math.min(Math.max(Number(days) || 5, 1), 30);
    const windowSize = Math.min(Math.max(Number(window) || 5, 2), 60);
    const methods = String(method).toLowerCase();
    const includeForecast = ['1', 'true', 'yes'].includes(
      String(req.query.forecast || req.query.includeForecast || '').toLowerCase()
    );

    const cacheKey = `advice:${type}:${symbol.toUpperCase()}:${horizonDays}:${includeForecast}`;
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
        methods: method === 'both' ? 'both' : methods,
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

app.use('/api', (req, res) => {
  res.status(404).json({
    error: `Endpoint non trovato: ${req.method} ${req.originalUrl}`,
    hint:
      'Controlla deploy Netlify (Functions) o avvia API locale (npm run dev:api). Route: /api/health, /api/market, /api/trade-advice, /api/analysis-bundle, /api/sources.',
  });
});

export default app;

const isDirectRun =
  process.argv[1]?.includes('server.js') && !process.env.AWS_LAMBDA_FUNCTION_NAME;

if (isDirectRun) {
  const server = app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT} (Yahoo Finance)`);
  });

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
