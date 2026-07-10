import { getCryptoEntry } from '../cryptoRegistry.js';
import { fetchBinance24hTicker, fetchBinanceKlines } from './binance.js';
import { fetchKrakenTicker, fetchKrakenOHLC } from './kraken.js';
import { isBitcoinSymbol, loadBitcoinMarketData } from './bitcoin.js';

/**
 * Carica spot crypto da Binance + Kraken quando definiti nel registro.
 */
export async function loadCryptoSpotMarketData(displaySymbol) {
  if (isBitcoinSymbol(displaySymbol)) {
    return loadBitcoinMarketData();
  }

  const entry = getCryptoEntry(displaySymbol);
  if (!entry?.binance) return null;

  const errors = [];
  let binanceQuote = null;
  let krakenQuote = null;
  let series = [];

  try {
    const [quote, klines] = await Promise.all([
      fetchBinance24hTicker(entry.binance),
      fetchBinanceKlines(entry.binance, '1d', 90),
    ]);
    binanceQuote = quote;
    series = klines;
  } catch (err) {
    errors.push(`Binance: ${err.message}`);
  }

  if (entry.kraken) {
    try {
      krakenQuote = await fetchKrakenTicker(entry.kraken);
      if (!series.length) {
        series = await fetchKrakenOHLC(entry.kraken, 1440);
      }
    } catch (err) {
      errors.push(`Kraken: ${err.message}`);
    }
  }

  const primary = binanceQuote || krakenQuote;
  if (!primary?.price) return null;

  if (!series.length) {
    series = [{ date: primary.asOf, price: primary.price }];
  }

  const quote = {
    ...primary,
    symbol: entry.id,
    currency: 'USD',
    exchanges: {
      binance: binanceQuote
        ? {
            price: binanceQuote.price,
            symbol: entry.binance,
            changePercent: binanceQuote.changePercent,
          }
        : null,
      kraken: krakenQuote
        ? {
            price: krakenQuote.price,
            pair: entry.kraken,
          }
        : null,
    },
    source:
      binanceQuote && krakenQuote
        ? 'binance+kraken'
        : primary.source || 'binance',
  };

  return {
    series,
    quote,
    meta: {
      provider: quote.source,
      resolvedSymbol: `${entry.binance}${entry.kraken ? ` / ${entry.kraken}` : ''}`,
      streams: entry.binance
        ? { binance: `wss://stream.binance.com/ws/${entry.binance.toLowerCase()}@ticker` }
        : null,
    },
  };
}
