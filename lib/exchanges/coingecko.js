import axios from 'axios';
import { toCoinGeckoId } from '../cryptoRegistry.js';

const REST = 'https://api.coingecko.com/api/v3';

/** True se il simbolo crypto ha un id CoinGecko noto. */
export function coinGeckoSupported(symbol) {
  return Boolean(toCoinGeckoId(symbol));
}

/**
 * Carica prezzo + storico giornaliero da CoinGecko (gratuito, senza chiave).
 * Ritorna { series, quote, meta } compatibile con gli altri provider, o null.
 */
export async function loadCoinGeckoMarketData(displaySymbol, days = 90) {
  const id = toCoinGeckoId(displaySymbol);
  if (!id) return null;

  const headers = { Accept: 'application/json' };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey;

  const [priceRes, chartRes] = await Promise.all([
    axios.get(`${REST}/simple/price`, {
      params: { ids: id, vs_currencies: 'usd', include_24hr_change: true },
      timeout: 15_000,
      headers,
    }),
    axios.get(`${REST}/coins/${id}/market_chart`, {
      params: { vs_currency: 'usd', days, interval: 'daily' },
      timeout: 20_000,
      headers,
    }),
  ]);

  const info = priceRes.data?.[id];
  const price = Number(info?.usd);
  if (!Number.isFinite(price) || price <= 0) return null;

  const changePercent = Number(info?.usd_24h_change);
  const rawPrices = Array.isArray(chartRes.data?.prices) ? chartRes.data.prices : [];

  // Una sola candela per giorno (l'ultimo valore vince).
  const byDay = new Map();
  for (const [ts, value] of rawPrices) {
    const p = Number(value);
    if (!Number.isFinite(p)) continue;
    byDay.set(new Date(ts).toISOString().slice(0, 10), p);
  }
  const series = [...byDay.entries()].map(([date, p]) => ({ date, price: p }));

  const asOf = series.length ? series[series.length - 1].date : new Date().toISOString().slice(0, 10);
  if (!series.length) series.push({ date: asOf, price });

  const quote = {
    symbol: String(displaySymbol).toUpperCase(),
    price,
    currency: 'USD',
    change: Number.isFinite(changePercent) ? (price * changePercent) / 100 : null,
    changePercent: Number.isFinite(changePercent) ? changePercent : null,
    asOf,
    source: 'coingecko',
  };

  return {
    series,
    quote,
    meta: { provider: 'coingecko', resolvedSymbol: id },
  };
}
