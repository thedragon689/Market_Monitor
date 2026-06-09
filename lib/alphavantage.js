import axios from 'axios';
import { isMetalType } from './marketType.js';

const AV_BASE = 'https://www.alphavantage.co/query';

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

/** Alpha Vantage solo per azioni e metalli — richiede STOCK_API_KEY / METALS_API_KEY in .env */
export function alphaVantageConfigured(type) {
  if (!['stock', 'national', 'precious', 'commodity'].includes(type)) return false;
  return Boolean(pickKey(type));
}

const METAL_AV = {
  XAUUSD: 'GLD',
  XAU: 'GLD',
  XAGUSD: 'SLV',
  XAG: 'SLV',
};

export async function fetchAvSeries(displaySymbol, type) {
  const apiKey = pickKey(type);
  if (!apiKey) return null;

  let symbol = displaySymbol.toUpperCase();
  if (isMetalType(type)) {
    const key = symbol.replace(/[^A-Z]/g, '');
    symbol = METAL_AV[key] || METAL_AV[symbol] || symbol;
  }

  const { data } = await axios.get(AV_BASE, {
    params: {
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize: 'compact',
      apikey: apiKey,
    },
    timeout: 20_000,
  });

  const err = avError(data);
  if (err) throw new Error(err);

  const series = data['Time Series (Daily)'];
  if (!series) return null;

  const history = Object.keys(series)
    .sort()
    .map((date) => ({
      date,
      price: parseFloat(series[date]['4. close']),
    }))
    .filter((p) => Number.isFinite(p.price));

  return { history, resolvedSymbol: symbol };
}
