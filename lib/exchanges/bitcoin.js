import { fetchBinance24hTicker, fetchBinanceKlines, fetchBinancePrice } from './binance.js';
import { fetchKrakenTicker, fetchKrakenOHLC } from './kraken.js';

export function isBitcoinSymbol(symbol) {
  const s = String(symbol).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return s === 'BTC-USD' || s === 'BTCUSD' || s === 'BTC';
}

/** Snapshot REST Binance + Kraken per catalogo/API. */
export async function fetchBitcoinLiveSnapshot() {
  const [binance, kraken] = await Promise.allSettled([
    fetchBinancePrice('BTCUSDT'),
    fetchKrakenTicker('XBTUSD'),
  ]);

  return {
    binance: binance.status === 'fulfilled' ? binance.value : null,
    kraken: kraken.status === 'fulfilled' ? kraken.value : null,
    updatedAt: new Date().toISOString(),
  };
}

/** Serie storica + quotazione aggregata (priorità Binance, conferma Kraken). */
export async function loadBitcoinMarketData() {
  const errors = [];
  let binanceQuote = null;
  let krakenQuote = null;
  let series = [];

  try {
    const [quote, klines] = await Promise.all([
      fetchBinance24hTicker('BTCUSDT'),
      fetchBinanceKlines('BTCUSDT', '1d', 90),
    ]);
    binanceQuote = quote;
    series = klines;
  } catch (err) {
    errors.push(`Binance: ${err.message}`);
  }

  try {
    krakenQuote = await fetchKrakenTicker('XBTUSD');
    if (!series.length) {
      series = await fetchKrakenOHLC('XBTUSD', 1440);
    }
  } catch (err) {
    errors.push(`Kraken: ${err.message}`);
  }

  const primary = binanceQuote || krakenQuote;
  if (!primary?.price) {
    throw new Error(
      errors.length
        ? errors.join(' · ')
        : 'Quotazione Bitcoin non disponibile (Binance/Kraken).'
    );
  }

  if (!series.length) {
    series = [{ date: primary.asOf, price: primary.price }];
  }

  const quote = {
    ...primary,
    symbol: 'BTC-USD',
    currency: 'USD',
    exchanges: {
      binance: binanceQuote
        ? { price: binanceQuote.price, symbol: 'BTCUSDT', changePercent: binanceQuote.changePercent }
        : null,
      kraken: krakenQuote
        ? { price: krakenQuote.price, pair: krakenQuote.krakenPair || 'XBTUSD' }
        : null,
    },
    source: binanceQuote && krakenQuote ? 'binance+kraken' : primary.source,
  };

  return {
    series,
    quote,
    meta: {
      provider: quote.source,
      resolvedSymbol: 'BTCUSDT / XBTUSD',
      proxy: null,
      streams: {
        binance: 'wss://stream.binance.com:9443/ws/btcusdt@ticker',
        kraken: 'wss://ws.kraken.com',
      },
    },
  };
}
