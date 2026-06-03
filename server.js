import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { analyzeMarket } from './lib/analyze.js';
import { getCache, setCache } from './lib/cache.js';
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

// process.cwd(): ok in locale e su Netlify (niente import.meta — esbuild lo rompe).
dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

const CACHE_TTL_MS = 10 * 60 * 1000;
const CATALOG_CACHE_MS = 2 * 60 * 1000;

const app = express();
app.use(cors());
app.use(express.json());

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

  return {
    symbol,
    price: last.price,
    currency: 'USD',
    change,
    changePercent,
    asOf: last.date,
    source: 'yahoo-finance',
    ...extra,
  };
}

async function getCachedMarket(symbol, type, { minPoints = 0 } = {}) {
  const cacheKey = `market:${type}:${symbol.toUpperCase()}`;
  const cached = getCache(cacheKey);
  const cachedPoints = cached?.series?.length ?? 0;
  const cacheUsable = cached && (!minPoints || cachedPoints >= minPoints);

  if (cacheUsable) {
    return { ...cached, fromCache: true, stale: false };
  }

  const payload = await loadMarketData(symbol, type);
  setCache(cacheKey, payload, CACHE_TTL_MS);
  return { ...payload, fromCache: false, stale: false };
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
  res.json({ ok: true, service: 'market-monitor-api', version: '1.0.0' });
});

app.get('/api/catalog', async (_req, res) => {
  try {
    const cached = getCache('full_catalog');
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const payload = await buildFullCatalog({
      getCachedMarket,
      loadFx,
    });
    setCache('full_catalog', payload, CATALOG_CACHE_MS);
    res.json({ ...payload, cached: false });
  } catch (err) {
    sendError(res, err, '/api/catalog');
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

    const maxPoints = Math.min(Math.max(Number(limit) || 90, 10), 120);
    const { series, quote, meta, fromCache, stale } = await getCachedMarket(symbol, type);

    const history = series.slice(-maxPoints);
    const fx = await loadFx();
    const baseQuote = quote || quoteFromSeries(history, symbol, { provider: meta.provider });

    res.json({
      symbol,
      type,
      ...meta,
      fx,
      quote: enrichQuoteWithEur(baseQuote, fx),
      history,
      cached: fromCache,
      stale,
      info: meta.historyLimited
        ? 'Quotazione aggiornata (Stooq). Per lo storico completo aggiungi STOOQ_API_KEY in .env.'
        : `Dati da ${meta.provider || 'mercato'}.`,
      warning:
        meta.historyLimited && !stale
          ? 'Storico limitato: aggiungi STOOQ_API_KEY (stooq.com) o riprova più tardi per Yahoo.'
          : undefined,
    });
  } catch (err) {
    sendError(res, err, '/api/market');
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
    const allowedMethods = ['both', 'sma', 'linear', 'log', 'logreturn', 'all'];
    if (!allowedMethods.includes(methods)) {
      return res.status(400).json({
        error:
          'Parametro "method": sma | linear | log | both | all (sma+linear+log-return)',
      });
    }

    const { series, meta, fromCache, stale } = await getCachedMarket(symbol, type, {
      minPoints: windowSize,
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

    const intelligence = await buildMarketIntelligence({
      symbol,
      type,
      series,
      prices,
      windowSize: Math.min(windowSize, prices.length),
      horizonDays,
      methods,
      includeCorrelations: true,
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
