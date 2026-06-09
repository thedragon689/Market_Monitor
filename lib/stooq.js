import axios from 'axios';
import { isCryptoType, isMetalType, isForexType, isEtfType } from './marketType.js';
import { toStooqForexSymbol } from './forexRegistry.js';
import { toStooqCryptoSymbol } from './cryptoRegistry.js';
import { toStooqNationalSymbol } from './nationalStockRegistry.js';
import { toStooqStockSymbol } from './stockRegistry.js';

/**
 * Stooq latest-price API (same family as https://stooq.pl/q/l/ used by Haskell wrappers).
 *
 * Ticker convention (suffix after the dot):
 * - `.US` — NYSE/Nasdaq (es. `AAPL.US`, `SPY.US`)
 * - `.UK` — London (LSE)
 * - `.DE` — Deutsche Börse
 * - `.JP` — Tokyo
 * - no suffix — Warsaw (GPW), es. `PKO`
 *
 * Metalli/commodity: simboli minuscoli (`xauusd`, `cl.f`, …).
 * OTC/ADR non quotati su NYSE spesso non sono disponibili come `.US`.
 */

const STOOQ_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
};

const STOOQ_HOSTS = ['https://stooq.com', 'https://stooq.pl'];

export const STOOQ_SYMBOL_MAP = {
  XAUUSD: 'xauusd',
  XAGUSD: 'xagusd',
  XPTUSD: 'xptusd',
  XPDUSD: 'xpdusd',
  WTI: 'cl.f',
  BRENT: 'br.f',
  NATGAS: 'ng.f',
  COPPER: 'hg.f',
  CORN: 'zc.f',
  WHEAT: 'zw.f',
  SOY: 'zs.f',
  SUGAR: 'sb.f',
  COFFEE: 'kc.f',
  COTTON: 'ct.f',
};

export const STOOQ_TICKER_HELP = {
  stock: 'Azioni USA: TICKER.US (es. AAPL.US)',
  metal: 'Metalli: xauusd, xagusd, cl.f, hg.f',
};

export function toStooqSymbol(symbol, type) {
  const upper = String(symbol).toUpperCase();
  if (isCryptoType(type)) return toStooqCryptoSymbol(symbol);
  if (type === 'national') return toStooqNationalSymbol(symbol);
  if (isForexType(type)) return toStooqForexSymbol(symbol);
  if (isEtfType(type) || type === 'rates' || type === 'macro' || type === 'sentiment') {
    return toStooqStockSymbol(symbol);
  }
  if (type === 'index' || type === 'volatility') {
    return String(symbol).trim().toLowerCase();
  }
  if (isMetalType(type)) {
    const key = upper.replace(/[^A-Z]/g, '');
    return (STOOQ_SYMBOL_MAP[key] || STOOQ_SYMBOL_MAP[upper] || upper).toLowerCase();
  }
  return toStooqStockSymbol(symbol);
}

function parseCsvRows(text) {
  const lines = String(text)
    .trim()
    .split('\n')
    .filter((line) => line && !line.toLowerCase().includes('apikey'));

  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    if (cols.length < 7) return null;

    const open = parseFloat(cols[3]);
    const high = parseFloat(cols[4]);
    const low = parseFloat(cols[5]);
    const close = parseFloat(cols[6]);
    const volume = parseInt(cols[7], 10);

    if (!Number.isFinite(close)) return null;

    return {
      symbol: cols[0],
      date: cols[1],
      time: cols[2] || null,
      open: Number.isFinite(open) ? open : null,
      high: Number.isFinite(high) ? high : null,
      low: Number.isFinite(low) ? low : null,
      close,
      volume: Number.isFinite(volume) ? volume : null,
    };
  }).filter(Boolean);
}

function rowToQuote(row) {
  const { open, close, date, high, low, volume, time, symbol } = row;
  return {
    symbol,
    date,
    time,
    open,
    high,
    low,
    close,
    price: close,
    volume,
    change: Number.isFinite(open) && Number.isFinite(close) ? close - open : null,
    changePercent:
      Number.isFinite(open) && open !== 0 && Number.isFinite(close)
        ? (((close - open) / open) * 100).toFixed(4)
        : null,
  };
}

async function requestLatestCsv(stooqSymbols) {
  const tickers = Array.isArray(stooqSymbols) ? stooqSymbols : [stooqSymbols];
  const s = tickers.join(' ');
  let lastErr;

  for (const host of STOOQ_HOSTS) {
    try {
      const { data } = await axios.get(`${host}/q/l/`, {
        params: { s, f: 'sd2t2ohlcv', h: '', e: 'csv' },
        headers: STOOQ_HEADERS,
        timeout: 15_000,
        responseType: 'text',
        transformResponse: [(r) => r],
      });

      const rows = parseCsvRows(data);
      if (rows.length) return rows;
      lastErr = new Error(`Stooq: nessun dato per ${s}`);
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr ?? new Error(`Stooq: richiesta fallita per ${s}`);
}

/** Ultima barra OHLCV per un simbolo (equivalente a `fetch "TICKER.US"` in Haskell). */
export async function fetchStooqLatest(stooqSymbol) {
  const rows = await requestLatestCsv(stooqSymbol);
  const row = rows.find(
    (r) => r.symbol.toLowerCase() === String(stooqSymbol).toLowerCase()
  ) ?? rows[0];

  if (!row) throw new Error(`Stooq: nessun dato per ${stooqSymbol}`);
  return rowToQuote(row);
}

/**
 * Più ticker in una sola richiesta HTTP (come `fetchPrices` nel wrapper Haskell).
 * @param {string[]} stooqSymbols es. ['aapl.us', 'msft.us']
 */
export async function fetchStooqLatestBatch(stooqSymbols) {
  if (!stooqSymbols?.length) return [];
  const rows = await requestLatestCsv(stooqSymbols);
  return rows.map(rowToQuote);
}

export async function fetchStooqHistory(stooqSymbol, apiKey) {
  if (!apiKey) return null;

  const { data } = await axios.get('https://stooq.com/q/d/l/', {
    params: { s: stooqSymbol, i: 'd', apikey: apiKey },
    headers: STOOQ_HEADERS,
    timeout: 25_000,
    responseType: 'text',
    transformResponse: [(r) => r],
  });

  if (typeof data !== 'string' || data.toLowerCase().includes('apikey')) {
    return null;
  }

  return data
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const cols = line.split(',');
      const close = parseFloat(cols[4] ?? cols[6]);
      const date = cols[0]?.includes('.') ? cols[0].split('.').pop() : cols[0];
      if (!date || !Number.isFinite(close)) return null;
      return { date, price: close };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}
