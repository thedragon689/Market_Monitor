import axios from 'axios';
import { isMetalType, isCryptoType } from './marketType.js';

const AV_BASE = 'https://www.alphavantage.co/query';

// Categorie coperte da Alpha Vantage (endpoint dedicati per forex/crypto).
const AV_TYPES = ['stock', 'national', 'precious', 'commodity', 'forex', 'crypto'];

function avError(data) {
  return data?.['Error Message'] || data?.Note || data?.Information || null;
}

function pickKey(type) {
  const primary = isMetalType(type) ? process.env.METALS_API_KEY : process.env.STOCK_API_KEY;
  const fallback = isMetalType(type) ? process.env.STOCK_API_KEY : process.env.METALS_API_KEY;
  for (const k of [primary, fallback]) {
    if (k && !k.startsWith('LA_TUA')) return k;
  }
  return null;
}

/** Alpha Vantage per azioni, metalli, forex e crypto — richiede STOCK_API_KEY / METALS_API_KEY. */
export function alphaVantageConfigured(type) {
  if (!AV_TYPES.includes(type)) return false;
  return Boolean(pickKey(type));
}

const METAL_AV = {
  XAUUSD: 'GLD',
  XAU: 'GLD',
  XAGUSD: 'SLV',
  XAG: 'SLV',
};

/** Estrae le due valute da una coppia forex (EUR/USD, EURUSD, EURUSD=X). */
function parseForexPair(displaySymbol) {
  const s = String(displaySymbol).toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length < 6) return null;
  return { from: s.slice(0, 3), to: s.slice(3, 6) };
}

/** Estrae il ticker base di una crypto (BTC-USD, BTCUSD, BTC → BTC). */
function parseCryptoBase(displaySymbol) {
  let base = String(displaySymbol).toUpperCase();
  base = base.replace(/[-/].*$/, '').replace(/USD$/, '').replace(/[^A-Z0-9]/g, '');
  return base || String(displaySymbol).toUpperCase();
}

async function avGet(params) {
  const { data } = await axios.get(AV_BASE, { params, timeout: 20_000 });
  const err = avError(data);
  if (err) throw new Error(err);
  return data;
}

function seriesFromMap(map, closeKey) {
  return Object.keys(map)
    .sort()
    .map((date) => ({ date, price: parseFloat(map[date][closeKey]) }))
    .filter((p) => Number.isFinite(p.price));
}

async function fetchAvForex(displaySymbol, apiKey) {
  const pair = parseForexPair(displaySymbol);
  if (!pair) return null;
  const data = await avGet({
    function: 'FX_DAILY',
    from_symbol: pair.from,
    to_symbol: pair.to,
    outputsize: 'compact',
    apikey: apiKey,
  });
  const map = data['Time Series FX (Daily)'];
  if (!map) return null;
  const history = seriesFromMap(map, '4. close');
  return { history, resolvedSymbol: `${pair.from}/${pair.to}`, currency: pair.to };
}

async function fetchAvCrypto(displaySymbol, apiKey) {
  const base = parseCryptoBase(displaySymbol);
  const market = 'USD';
  const data = await avGet({
    function: 'DIGITAL_CURRENCY_DAILY',
    symbol: base,
    market,
    apikey: apiKey,
  });
  const map = data['Time Series (Digital Currency Daily)'];
  if (!map) return null;
  // AV ha usato sia "4a. close (USD)" sia il formato semplice "4. close".
  const sample = map[Object.keys(map)[0]] || {};
  const closeKey =
    ['4a. close (USD)', `4a. close (${market})`, '4. close', '4b. close (USD)'].find(
      (k) => k in sample
    ) || '4. close';
  const history = seriesFromMap(map, closeKey);
  return { history, resolvedSymbol: `${base}/${market}`, currency: market };
}

export async function fetchAvSeries(displaySymbol, type) {
  const apiKey = pickKey(type);
  if (!apiKey) return null;

  if (type === 'forex') return fetchAvForex(displaySymbol, apiKey);
  if (isCryptoType(type)) return fetchAvCrypto(displaySymbol, apiKey);

  // Azioni / metalli: serie giornaliera (con proxy ETF per i metalli).
  let symbol = displaySymbol.toUpperCase();
  if (isMetalType(type)) {
    const key = symbol.replace(/[^A-Z]/g, '');
    symbol = METAL_AV[key] || METAL_AV[symbol] || symbol;
  }

  const data = await avGet({
    function: 'TIME_SERIES_DAILY',
    symbol,
    outputsize: 'compact',
    apikey: apiKey,
  });

  const map = data['Time Series (Daily)'];
  if (!map) return null;
  const history = seriesFromMap(map, '4. close');
  return { history, resolvedSymbol: symbol, currency: 'USD' };
}
