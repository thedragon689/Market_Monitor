import axios from 'axios';

const REST = 'https://api.binance.com/api/v3';

export async function fetchBinancePrice(symbol = 'BTCUSDT') {
  const { data } = await axios.get(`${REST}/ticker/price`, {
    params: { symbol },
    timeout: 12_000,
    headers: { Accept: 'application/json' },
  });

  return {
    symbol: data.symbol,
    price: parseFloat(data.price),
    currency: 'USD',
    source: 'binance',
  };
}

export async function fetchBinance24hTicker(symbol = 'BTCUSDT') {
  const { data } = await axios.get(`${REST}/ticker/24hr`, {
    params: { symbol },
    timeout: 12_000,
    headers: { Accept: 'application/json' },
  });

  return {
    symbol: 'BTC-USD',
    binanceSymbol: data.symbol,
    price: parseFloat(data.lastPrice),
    currency: 'USD',
    change: parseFloat(data.priceChange),
    changePercent: parseFloat(data.priceChangePercent),
    asOf: new Date(data.closeTime || Date.now()).toISOString().slice(0, 10),
    source: 'binance',
  };
}

/** Kline giornalieri (close = indice 4). */
export async function fetchBinanceKlines(symbol = 'BTCUSDT', interval = '1d', limit = 90) {
  const { data } = await axios.get(`${REST}/klines`, {
    params: { symbol, interval, limit },
    timeout: 15_000,
    headers: { Accept: 'application/json' },
  });

  return data
    .map((k) => ({
      date: new Date(k[0]).toISOString().slice(0, 10),
      price: parseFloat(k[4]),
    }))
    .filter((p) => Number.isFinite(p.price));
}
