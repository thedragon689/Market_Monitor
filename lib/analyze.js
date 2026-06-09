import { computeIndicators, computeCommodityIndicators } from './indicators.js';
import { isMetalType } from './marketType.js';
import { linearForecast, logReturnForecast } from './forecastModels.js';
import { fetchQuote, fetchHistoryPrices, mapYahooQuoteResult, normalizeSymbol } from './yahooFetch.js';
import { loadMarketData, toYahooSymbol } from './yahoo.js';

/**
 * §7 — Analisi completa: quote, indicatori, previsioni.
 * Usa loadMarketData (Yahoo chart + fallback Stooq/FCS) e arricchisce con quote v7.
 */
export async function analyzeMarket(displaySymbol, type = 'stock', options = {}) {
  const symbol = normalizeSymbol(displaySymbol);
  const horizonDays = options.horizonDays ?? 5;
  const windowSize = options.windowSize ?? 5;
  const yahooSymbol = toYahooSymbol(symbol, type);

  const market = await loadMarketData(symbol, type);
  const pricesFromSeries = market.series.map((p) => p.price);

  let prices = pricesFromSeries;
  if (prices.length < 14) {
    try {
      const yahooPrices = await fetchHistoryPrices(yahooSymbol);
      if (yahooPrices.length > prices.length) prices = yahooPrices;
    } catch {
      /* usa serie già caricata */
    }
  }

  let yahooQuoteRaw = null;
  let yahooQuote = null;
  try {
    yahooQuoteRaw = await fetchQuote(yahooSymbol);
    yahooQuote = mapYahooQuoteResult(yahooQuoteRaw, symbol);
  } catch {
    /* opzionale */
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
      logReturn: logReturnForecast(prices, horizonDays),
    },
    series: market.series,
    meta: market.meta,
  };
}
