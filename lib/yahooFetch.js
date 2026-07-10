import { getCache, setCache } from './cache.js';
import { fetchYahooChartDirect } from './yahooChartDirect.js';

const QUOTE_TTL_MS = 10_000;
const CSV_TTL_MS = 3_600_000;
const YAHOO_HTTP_TIMEOUT_MS = Number(process.env.YAHOO_HTTP_TIMEOUT_MS) || 12_000;

const UA = 'Mozilla/5.0';

export function normalizeSymbol(symbol) {
  return String(symbol).trim().toUpperCase();
}

async function yahooGetText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' },
    signal: AbortSignal.timeout(YAHOO_HTTP_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok || !text || /too many requests/i.test(text)) {
    throw new Error(res.ok ? 'Yahoo rate limit o risposta vuota' : `Yahoo HTTP ${res.status}`);
  }
  return text;
}

/** §1 — Quotazione live (v7 quote, senza API key). */
export async function fetchQuote(yahooSymbol) {
  const sym = normalizeSymbol(yahooSymbol);
  const cacheKey = `quote_${sym}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
  const text = await yahooGetText(url);
  const data = JSON.parse(text);
  const result = data?.quoteResponse?.result?.[0];
  if (!result) throw new Error(`Quotazione Yahoo non trovata per ${sym}`);

  setCache(cacheKey, result, QUOTE_TTL_MS);
  return result;
}

/** §2 — Storico CSV giornaliero. */
export async function fetchHistoryCSV(yahooSymbol) {
  const sym = normalizeSymbol(yahooSymbol);
  const cacheKey = `csv_${sym}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url =
    `https://query1.finance.yahoo.com/v7/finance/download/${encodeURIComponent(sym)}` +
    '?period1=0&period2=9999999999&interval=1d&events=history';

  const csv = await yahooGetText(url);
  if (!csv.includes('Date') && !csv.includes('date')) {
    throw new Error('CSV Yahoo non valido');
  }

  setCache(cacheKey, csv, CSV_TTL_MS);
  return csv;
}

/** §3 — Estrae i close dal CSV. */
export function csvToPrices(csv) {
  const lines = String(csv).split('\n').slice(1);
  return lines
    .map((l) => l.split(',')[4])
    .filter((v) => v && v !== 'null' && v !== 'Close')
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

/** Storico close: CSV Yahoo, fallback chart v8. */
export async function fetchHistoryPrices(yahooSymbol) {
  try {
    const csv = await fetchHistoryCSV(yahooSymbol);
    const prices = csvToPrices(csv);
    if (prices.length >= 2) return prices;
  } catch {
    /* download spesso bloccato → chart */
  }

  const { series } = await fetchYahooChartDirect(yahooSymbol, '2y', '1d', { fetchOnly: true });
  return series.map((p) => p.price);
}

/** Mappa risposta v7 quote → formato app. */
export function mapYahooQuoteResult(result, displaySymbol) {
  if (!result) return null;
  const price = result.regularMarketPrice ?? result.postMarketPrice;
  return {
    symbol: displaySymbol,
    price,
    currency: result.currency || 'USD',
    change: result.regularMarketChange,
    changePercent:
      result.regularMarketChangePercent != null
        ? Number(result.regularMarketChangePercent).toFixed(4)
        : null,
    asOf: result.regularMarketTime
      ? new Date(result.regularMarketTime * 1000).toISOString().slice(0, 10)
      : null,
    source: 'yahoo-quote-v7',
    marketState: result.marketState,
  };
}
