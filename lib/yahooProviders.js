import { isCryptoType, isMetalType } from './marketType.js';
import { toYahooCryptoSymbol } from './cryptoRegistry.js';
import { toYahooNationalSymbol } from './nationalStockRegistry.js';
import { toYahooStockSymbol } from './stockRegistry.js';
import { toYahooIndexSymbol } from './indexRegistry.js';
import { toYahooForexSymbol } from './forexRegistry.js';
import { toYahooEtfSymbol } from './etfRegistry.js';
import { toYahooVolatilitySymbol } from './volatilityRegistry.js';
import { toYahooRatesSymbol } from './ratesRegistry.js';
import { toYahooMacroSymbol } from './macroRegistry.js';
import { toYahooSentimentSymbol } from './sentimentRegistry.js';
import { fetchAvSeries } from './alphavantage.js';
import { fetchFcsMetalSeries } from './fcsapi.js';
import {
  fetchStooqHistory,
  fetchStooqLatest,
  toStooqSymbol,
} from './stooq.js';
import { fetchYahooChartDirect } from './yahooChartDirect.js';

import { COMMODITY_REGISTRY, PRECIOUS_COMMODITY_PROFILE } from './commodityRegistry.js';

const REGISTRY_YAHOO = Object.fromEntries([
  ...COMMODITY_REGISTRY.map((c) => [c.id, c.yahooSpot]),
  ...PRECIOUS_COMMODITY_PROFILE.map((c) => [c.id, c.yahooSpot]),
]);

export const YAHOO_SYMBOL_MAP = {
  XAUUSD: 'GC=F',
  XAGUSD: 'SI=F',
  XPTUSD: 'PL=F',
  XPDUSD: 'PA=F',
  WTI: 'CL=F',
  BRENT: 'BZ=F',
  NATGAS: 'NG=F',
  COPPER: 'HG=F',
  NICKEL: 'JJN',
  LIT: 'LIT',
  CORN: 'ZC=F',
  WHEAT: 'ZW=F',
  SOY: 'ZS=F',
  ...REGISTRY_YAHOO,
};

export function toYahooSymbol(symbol, type) {
  const upper = String(symbol).toUpperCase();
  if (isCryptoType(type)) return toYahooCryptoSymbol(symbol);
  if (type === 'national') return toYahooNationalSymbol(symbol);
  if (type === 'index') return toYahooIndexSymbol(symbol);
  if (type === 'forex') return toYahooForexSymbol(symbol);
  if (type === 'etf') return toYahooEtfSymbol(symbol);
  if (type === 'volatility') return toYahooVolatilitySymbol(symbol);
  if (type === 'rates') return toYahooRatesSymbol(symbol);
  if (type === 'macro') return toYahooMacroSymbol(symbol);
  if (type === 'sentiment') return toYahooSentimentSymbol(symbol);
  if (isMetalType(type)) {
    const key = upper.replace(/[^A-Z]/g, '');
    return YAHOO_SYMBOL_MAP[key] || YAHOO_SYMBOL_MAP[upper] || upper;
  }
  return toYahooStockSymbol(symbol);
}

export async function tryYahoo(displaySymbol, type) {
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

export async function tryAlphaVantage(displaySymbol, type) {
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

export async function tryFcs(displaySymbol, type) {
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

export async function tryStooq(displaySymbol, type, existingSeries) {
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
