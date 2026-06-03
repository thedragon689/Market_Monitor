import { isCryptoType, isMetalType, isPreciousType } from './marketType.js';
import { toYahooCryptoSymbol } from './cryptoRegistry.js';
import { toYahooNationalSymbol } from './nationalStockRegistry.js';
import { toYahooStockSymbol } from './stockRegistry.js';
import { fetchAvSeries } from './alphavantage.js';
import { isBitcoinSymbol, loadBitcoinMarketData } from './exchanges/bitcoin.js';
import { fetchFcsMetalSeries } from './fcsapi.js';
import {
  fetchStooqHistory,
  fetchStooqLatest,
  toStooqSymbol,
} from './stooq.js';
import { fetchYahooChartDirect } from './yahooChartDirect.js';

export const YAHOO_SYMBOL_MAP = {
  XAUUSD: 'GC=F',
  XAGUSD: 'SI=F',
  XPTUSD: 'PL=F',
  XPDUSD: 'PA=F',
  WTI: 'CL=F',
  COPPER: 'HG=F',
};

export function toYahooSymbol(symbol, type) {
  const upper = String(symbol).toUpperCase();
  if (isCryptoType(type)) return toYahooCryptoSymbol(symbol);
  if (type === 'national') return toYahooNationalSymbol(symbol);
  if (isMetalType(type)) {
    const key = upper.replace(/[^A-Z]/g, '');
    return YAHOO_SYMBOL_MAP[key] || YAHOO_SYMBOL_MAP[upper] || upper;
  }
  return toYahooStockSymbol(symbol);
}

async function tryYahoo(displaySymbol, type) {
  const yahooSymbol = toYahooSymbol(displaySymbol, type);
  const { series, quote, meta } = await fetchYahooChartDirect(yahooSymbol);

  return {
    series,
    quote: {
      symbol: displaySymbol,
      ...quote,
      currency: meta.currency || quote.currency || 'USD',
      source: 'yahoo-finance',
    },
    meta: {
      provider: 'yahoo-finance',
      resolvedSymbol: yahooSymbol,
      proxy: isMetalType(type) ? 'futures Yahoo (proxy)' : null,
    },
  };
}

async function tryAlphaVantage(displaySymbol, type) {
  const av = await fetchAvSeries(displaySymbol, type);
  if (!av?.history?.length) return null;

  const last = av.history[av.history.length - 1];
  const prev = av.history[av.history.length - 2];
  const change = prev ? last.price - prev.price : null;

  return {
    series: av.history,
    quote: {
      symbol: displaySymbol,
      price: last.price,
      currency: 'USD',
      change,
      changePercent:
        prev && prev.price ? (((last.price - prev.price) / prev.price) * 100).toFixed(4) : null,
      asOf: last.date,
      source: 'alphavantage',
    },
    meta: {
      provider: 'alphavantage',
      resolvedSymbol: av.resolvedSymbol,
      proxy: isMetalType(type) ? 'proxy ETF (Alpha Vantage)' : null,
    },
  };
}

async function tryFcs(displaySymbol, type) {
  if (type === 'stock' || !isMetalType(type)) return null;

  const fcs = await fetchFcsMetalSeries(displaySymbol);
  if (!fcs?.history?.length) return null;

  const last = fcs.history[fcs.history.length - 1];
  const prev = fcs.history[fcs.history.length - 2];
  const change = prev ? last.price - prev.price : null;

  return {
    series: fcs.history,
    quote: {
      symbol: displaySymbol,
      price: last.price,
      currency: 'USD',
      change,
      changePercent:
        prev && prev.price ? (((last.price - prev.price) / prev.price) * 100).toFixed(4) : null,
      asOf: last.date,
      source: 'fcsapi',
    },
    meta: {
      provider: 'fcsapi',
      resolvedSymbol: fcs.resolvedSymbol,
    },
  };
}

async function tryStooq(displaySymbol, type, existingSeries) {
  const stooqSymbol = toStooqSymbol(displaySymbol, type);
  const latest = await fetchStooqLatest(stooqSymbol);

  let series = existingSeries;
  const stooqKey = process.env.STOOQ_API_KEY;
  if (!series?.length && stooqKey && !stooqKey.startsWith('LA_TUA')) {
    series = await fetchStooqHistory(stooqSymbol, stooqKey);
  }

  if (!series?.length) {
    series = [
      {
        date: latest.date,
        price: latest.close,
      },
    ];
  }

  return {
    series,
    quote: {
      symbol: displaySymbol,
      price: latest.close,
      currency: 'USD',
      change: latest.change,
      changePercent: latest.changePercent,
      asOf: latest.date,
      source: 'stooq',
    },
    meta: {
      provider: 'stooq',
      resolvedSymbol: stooqSymbol,
      historyLimited: !stooqKey || series.length < 10,
    },
  };
}

export async function loadMarketData(displaySymbol, type) {
  if (type === 'crypto' && isBitcoinSymbol(displaySymbol)) {
    try {
      return await loadBitcoinMarketData();
    } catch (err) {
      /* fallback Yahoo/Stooq sotto */
    }
  }

  const errors = [];
  let stooqFallback = null;

  try {
    return await tryYahoo(displaySymbol, type);
  } catch (err) {
    errors.push(`Yahoo: ${err.message}`);
  }

  try {
    const fcs = await tryFcs(displaySymbol, type);
    if (fcs) return fcs;
  } catch (err) {
    errors.push(`FCS: ${err.message}`);
  }

  const stooqKey = process.env.STOOQ_API_KEY;
  if (stooqKey && !stooqKey.startsWith('LA_TUA')) {
    try {
      const stooqSymbol = toStooqSymbol(displaySymbol, type);
      const history = await fetchStooqHistory(stooqSymbol, stooqKey);
      if (history?.length) {
        return await tryStooq(displaySymbol, type, history);
      }
    } catch (err) {
      errors.push(`Stooq storico: ${err.message}`);
    }
  }

  try {
    stooqFallback = await tryStooq(displaySymbol, type, null);
  } catch (err) {
    errors.push(`Stooq: ${err.message}`);
  }

  try {
    const av = await tryAlphaVantage(displaySymbol, type);
    if (av) return av;
  } catch (err) {
    errors.push(`Alpha Vantage: ${err.message}`);
  }

  if (stooqFallback) return stooqFallback;

  throw new Error(
    `Impossibile aggiornare i dati. ${errors.join(' · ')}. ` +
      'Riprova tra qualche minuto oppure aggiungi STOOQ_API_KEY in .env (gratis su stooq.com).'
  );
}
