import { fetchYahooChartDirect } from './yahooChartDirect.js';

const FX_CACHE_MS = 30 * 60 * 1000;
let cachedRate = null;

/** Quanti USD per 1 EUR (es. 1.16 → 1 € = 1,16 $). */
export async function getEurUsdRate() {
  if (cachedRate && Date.now() - cachedRate.at < FX_CACHE_MS) {
    return cachedRate.payload;
  }

  const { quote, lastBar } = await fetchYahooChartDirect('EURUSD=X', '5d');
  const eurUsd = quote?.price ?? lastBar?.price;
  if (!eurUsd || !Number.isFinite(eurUsd) || eurUsd <= 0) {
    throw new Error('Cambio EUR/USD non disponibile');
  }

  const payload = {
    eurUsd,
    asOf: quote?.asOf ?? lastBar?.date ?? null,
    pair: 'EURUSD=X',
  };
  cachedRate = { at: Date.now(), payload };
  return payload;
}

export function usdToEur(amountUsd, eurUsd) {
  if (amountUsd == null || !Number.isFinite(amountUsd) || !eurUsd) return null;
  return amountUsd / eurUsd;
}
