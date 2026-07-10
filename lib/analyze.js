import { computeIndicators, computeCommodityIndicators } from './indicators.js';
import { isMetalType } from './marketType.js';
import { linearForecast, logReturnForecast } from './forecastModels.js';
import { fetchQuote, fetchHistoryPrices, mapYahooQuoteResult, normalizeSymbol } from './yahooFetch.js';
import { loadMarketData, toYahooSymbol } from './yahoo.js';

/**
 * Analisi da payload mercato già caricato (evita doppio fetch).
 */
export async function analyzeFromMarket(market, displaySymbol, type = 'stock', options = {}) {
  const symbol = normalizeSymbol(displaySymbol);
  const horizonDays = options.horizonDays ?? 5;
  const windowSize = options.windowSize ?? 5;
  const yahooSymbol = toYahooSymbol(symbol, type);
  const pricesFromSeries = (market.series || []).map((p) => p.price);

  let prices = pricesFromSeries;
  if (prices.length < 14 && !options.skipExtraHistory) {
    try {
      const yahooPrices = await fetchHistoryPrices(yahooSymbol);
      if (yahooPrices.length > prices.length) prices = yahooPrices;
    } catch {
      /* usa serie già caricata */
    }
  }

  let yahooQuote = null;
  if (!options.skipLiveQuote) {
    try {
      const yahooQuoteRaw = await fetchQuote(yahooSymbol);
      yahooQuote = mapYahooQuoteResult(yahooQuoteRaw, symbol);
    } catch {
      /* opzionale */
    }
  }

  const quote = market.quote || yahooQuote;

  return {
    symbol,
    type,
    yahooSymbol,
    quote,
    yahooQuote,
    provider: market.meta?.provider,
    resolvedSymbol: market.meta?.resolvedSymbol,
    pricesCount: prices.length,
    indicators: isMetalType(type)
      ? computeCommodityIndicators(prices)
      : computeIndicators(prices),
    forecast: {
      linear: linearForecast(prices, horizonDays, windowSize),
      logReturn: logReturnForecast(prices, horizonDays, windowSize),
    },
    series: market.series,
    meta: market.meta,
  };
}

/**
 * §7 — Analisi completa: quote, indicatori, previsioni.
 * Usa loadMarketData (Yahoo chart + fallback Stooq/FCS) e arricchisce con quote v7.
 */
export async function analyzeMarket(displaySymbol, type = 'stock', options = {}) {
  const market = await loadMarketData(normalizeSymbol(displaySymbol), type);
  return analyzeFromMarket(market, displaySymbol, type, options);
}
