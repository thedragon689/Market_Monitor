#!/usr/bin/env node
/**
 * Check totale: import dati live + coerenza formule su API.
 * Uso: node scripts/verify-data-integrity.js [baseUrl]
 */
import { computeIndicators } from '../lib/indicators.js';
import { linearForecast } from '../lib/forecastModels.js';
import { usdToEur } from '../lib/fx.js';
import { macd } from '../lib/indicators.js';

const base = (process.argv[2] || 'https://valutazioniborsa.netlify.app').replace(/\/$/, '');

const ASSETS = [
  { symbol: 'AAPL', type: 'stock', label: 'AAPL (USD)' },
  { symbol: 'ENEL.MI', type: 'national', label: 'ENEL.MI (EUR)' },
  { symbol: 'BTC-USD', type: 'crypto', label: 'BTC-USD' },
  { symbol: 'WTI', type: 'commodity', label: 'WTI' },
  { symbol: 'XAUUSD', type: 'precious', label: 'Oro XAUUSD' },
];

let passed = 0;
let failed = 0;
let warned = 0;

function ok(msg) {
  passed += 1;
  console.log('  ✓', msg);
}

function fail(msg) {
  failed += 1;
  console.error('  ✗', msg);
}

function warn(msg) {
  warned += 1;
  console.warn('  ⚠', msg);
}

function near(a, b, tolPct = 1) {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) || b === 0) return false;
  return Math.abs((a - b) / b) * 100 <= tolPct;
}

async function get(path, label = path) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      fail(`${label} — HTTP ${res.status}: ${data?.error || ''}`);
      return null;
    }
    return data;
  } catch (err) {
    fail(`${label} — rete: ${err.message}`);
    return null;
  }
}

function checkFxMath(quote, fx, label) {
  if (!fx?.eurUsd || !quote?.price) return;
  const eurUsd = fx.eurUsd;
  const ccy = (quote.currency || 'USD').toUpperCase();

  if (ccy === 'USD' && quote.priceEur != null) {
    const expected = usdToEur(quote.price, eurUsd);
    if (near(quote.priceEur, expected, 0.05)) {
      ok(`${label} — FX USD→EUR coerente (${quote.priceEur} ≈ ${expected?.toFixed(4)})`);
    } else {
      fail(`${label} — FX USD→EUR errato: priceEur=${quote.priceEur}, atteso≈${expected}`);
    }
    if (quote.priceUsd != null && near(quote.priceUsd, quote.price, 0.01)) {
      ok(`${label} — priceUsd = price nativo`);
    }
  }

  if (ccy === 'EUR' && quote.priceUsd != null) {
    const expected = quote.price * eurUsd;
    if (near(quote.priceUsd, expected, 0.05)) {
      ok(`${label} — FX EUR→USD coerente`);
    } else {
      fail(`${label} — FX EUR→USD errato: priceUsd=${quote.priceUsd}, atteso≈${expected}`);
    }
    if (quote.priceEur != null && near(quote.priceEur, quote.price, 0.01)) {
      ok(`${label} — priceEur = price nativo`);
    }
  }
}

function checkHistoryIntegrity(history, quote, label) {
  if (!Array.isArray(history) || history.length === 0) {
    fail(`${label} — storico vuoto`);
    return null;
  }

  const prices = history.map((h) => h.price);
  const dates = history.map((h) => h.date);

  if (prices.some((p) => p == null || !Number.isFinite(p) || p <= 0)) {
    fail(`${label} — prezzi non validi nello storico`);
  } else {
    ok(`${label} — storico ${history.length} punti, tutti prezzi > 0`);
  }

  for (let i = 1; i < dates.length; i++) {
    if (dates[i] < dates[i - 1]) {
      fail(`${label} — date non monotone a indice ${i}`);
      break;
    }
  }
  if (dates.length > 1) ok(`${label} — date monotone`);

  const lastHist = history[history.length - 1]?.price;
  if (quote?.price && lastHist) {
    const diffPct = Math.abs((lastHist - quote.price) / quote.price) * 100;
    if (diffPct <= 3) {
      ok(`${label} — ultimo storico ≈ quote (${diffPct.toFixed(2)}% diff)`);
    } else if (diffPct <= 8) {
      warn(`${label} — ultimo storico vs quote: ${diffPct.toFixed(2)}% (mercato chiuso o provider diverso)`);
    } else {
      fail(`${label} — ultimo storico vs quote: ${diffPct.toFixed(2)}% (>8%)`);
    }
  }

  return prices;
}

function checkIndicatorsMatch(prices, apiIndicators, label) {
  if (!prices?.length || prices.length < 30) {
    warn(`${label} — storico corto, skip confronto indicatori`);
    return;
  }

  const local = computeIndicators(prices);
  const pairs = [
    ['sma14', 'sma14'],
    ['sma20', 'sma20'],
    ['rsi14', 'rsi14'],
    ['ema14', 'ema14'],
  ];

  for (const [localKey, apiKey] of pairs) {
    const a = local[localKey];
    const b = apiIndicators?.[apiKey];
    if (a == null || b == null) continue;
    if (near(a, b, 0.1)) {
      ok(`${label} — ${apiKey} API≈locale (${b} vs ${a})`);
    } else {
      fail(`${label} — ${apiKey} diverge: API=${b}, locale=${a}`);
    }
  }

  const macdLocal = macd(prices);
  const macdApi = apiIndicators?.macd;
  if (macdLocal && macdApi) {
    const histDelta = Math.abs(macdApi.histogram - (macdApi.macdLine - macdApi.signal));
    const histOk = histDelta < 0.001;
    if (histOk) ok(`${label} — MACD histogram = line − signal`);
    else fail(`${label} — MACD histogram incoerente`);

    if (near(macdLocal.macdLine, macdApi.macdLine, 1)) {
      ok(`${label} — MACD line API≈locale`);
    } else {
      fail(`${label} — MACD line diverge: API=${macdApi.macdLine}, locale=${macdLocal.macdLine}`);
    }
  }

  const rsi = apiIndicators?.rsi14;
  if (rsi != null && rsi >= 0 && rsi <= 100) ok(`${label} — RSI14 in [0,100]`);
  else if (rsi != null) fail(`${label} — RSI14 fuori range: ${rsi}`);
}

function checkLinearForecast(prices, apiForecast, label) {
  if (!apiForecast?.linear || !prices?.length) return;
  const windowSize = apiForecast.linear.window || 5;
  const local = linearForecast(prices, 1, windowSize);
  const apiNext = apiForecast.linear.forecasts?.[0]?.price;
  const localNext = local?.forecasts?.[0]?.price;
  if (apiNext != null && localNext != null) {
    if (near(apiNext, localNext, 0.5)) {
      ok(`${label} — forecast lineare coerente (next≈${apiNext})`);
    } else {
      fail(`${label} — forecast lineare diverge: API=${apiNext}, locale=${localNext}`);
    }
  }
}

async function checkCatalogVsMarket(catalog, fx) {
  console.log('\n── Catalogo vs Market (coerenza prezzi) ──\n');

  for (const { symbol, type, label } of ASSETS) {
    const catEntry = catalog?.[type]?.find((a) => a.id === symbol || a.symbol === symbol);
    const catPrice = catEntry?.quote?.price;
    if (!catPrice) {
      warn(`${label} — assente o senza prezzo nel catalogo`);
      continue;
    }

    const market = await get(
      `/api/market?symbol=${encodeURIComponent(symbol)}&type=${type}&limit=90`,
      `market ${symbol}`
    );
    if (!market?.quote?.price) continue;
    const mktPrice = market.quote.price;
    const diffPct = Math.abs((catPrice - mktPrice) / mktPrice) * 100;

    if (diffPct <= 2) {
      ok(`${label} — catalogo≈market (${diffPct.toFixed(2)}%)`);
    } else if (diffPct <= 6) {
      warn(`${label} — catalogo vs market ${diffPct.toFixed(2)}% (Stooq batch vs multi-source)`);
    } else {
      fail(`${label} — catalogo vs market ${diffPct.toFixed(2)}% (>6%)`);
    }

    checkFxMath(market.quote, market.fx || fx, label);
  }
}

async function checkAnalysisBundle() {
  console.log('\n── Analysis bundle (formule su dati live) ──\n');

  for (const { symbol, type, label } of ASSETS.slice(0, 3)) {
    const bundle = await get(
      `/api/analysis-bundle?symbol=${encodeURIComponent(symbol)}&type=${type}&days=5&window=5&method=all`,
      `analysis ${symbol}`
    );
    if (!bundle?.analysis) continue;

    const history = bundle.analysis.series || bundle.intelligence?.history || [];
    const prices = checkHistoryIntegrity(
      Array.isArray(history) ? history : [],
      bundle.analysis.quote,
      label
    );

    if (prices) {
      checkIndicatorsMatch(prices, bundle.analysis.indicators, label);
      checkLinearForecast(prices, bundle.analysis.forecast, label);
    }

    const corr = bundle.intelligence?.correlations?.pairs;
    if (Array.isArray(corr) && corr.length > 0) {
      const valid = corr.every(
        (c) => c.correlation == null || (c.correlation >= -1 && c.correlation <= 1)
      );
      if (valid) ok(`${label} — correlazioni ρ ∈ [-1,1]`);
      else fail(`${label} — correlazione fuori range`);
    }
  }
}

async function checkFxEndpoint() {
  console.log('\n── FX (EUR/USD) ──\n');
  const fx = await get('/api/fx', 'GET /api/fx');
  if (!fx?.eurUsd) return null;
  if (fx.eurUsd > 0.8 && fx.eurUsd < 1.5) {
    ok(`EUR/USD = ${fx.eurUsd} (range plausibile)`);
  } else {
    fail(`EUR/USD fuori range: ${fx.eurUsd}`);
  }
  return fx;
}

async function main() {
  console.log(`\n═══ Check integrità dati + formule ═══`);
  console.log(`Base: ${base}\n`);

  const fx = await checkFxEndpoint();

  const catalogResp = await get('/api/catalog', 'GET /api/catalog');
  if (catalogResp?.catalog) {
    const types = Object.keys(catalogResp.catalog);
    const total = types.reduce((n, t) => n + (catalogResp.catalog[t]?.length || 0), 0);
    ok(`Catalogo: ${types.length} categorie, ${total} asset`);
    if (catalogResp.fx?.eurUsd) ok(`Catalogo include FX (${catalogResp.fx.eurUsd})`);
    await checkCatalogVsMarket(catalogResp.catalog, catalogResp.fx || fx);
  }

  await checkAnalysisBundle();

  console.log(`\n═══ Risultato: ${passed} OK, ${warned} WARN, ${failed} FAIL ═══\n`);

  if (failed > 0) process.exit(1);
}

main();
