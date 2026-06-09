import { fetchYahooChartDirect } from '../yahooChartDirect.js';

/**
 * Chart Yahoo esteso: OHLCV + open interest da meta futures.
 */
export async function fetchYahooCommodityChart(yahooSymbol, range = '6mo') {
  const base = await fetchYahooChartDirect(yahooSymbol, range);
  return enrichFromMeta(base, yahooSymbol);
}

function enrichFromMeta(base, yahooSymbol) {
  const meta = base.meta || {};
  const q = meta.regularMarketVolume != null ? meta : {};

  const quote = {
    ...base.quote,
    symbol: yahooSymbol,
    high: meta.regularMarketDayHigh ?? meta.dayHigh ?? null,
    low: meta.regularMarketDayLow ?? meta.dayLow ?? null,
    open: meta.regularMarketOpen ?? meta.open ?? null,
    volume: meta.regularMarketVolume ?? null,
    openInterest: meta.openInterest ?? meta.regularMarketOpenInterest ?? null,
    previousClose: meta.chartPreviousClose ?? meta.previousClose ?? null,
  };

  return {
    ...base,
    quote,
    meta: {
      ...meta,
      exchange: meta.exchangeName ?? meta.fullExchangeName ?? null,
      instrumentType: meta.instrumentType ?? 'FUTURE',
    },
  };
}
