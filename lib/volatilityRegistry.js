/** Volatilità — indici VIX e correlati. */

export const VOLATILITY_ASSETS = [
  { id: '^VIX', yahoo: '^VIX', name: 'VIX', hint: 'Volatilità implicita S&P 500', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^VVIX', yahoo: '^VVIX', name: 'VVIX', hint: 'Volatilità del VIX', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^SKEW', yahoo: '^SKEW', name: 'SKEW', hint: 'Coda sinistra · rischio tail', pricingKind: 'perIndex', unit: 'punti' },
  { id: 'VXX', yahoo: 'VXX', name: 'VXX', hint: 'ETN volatilità a breve', pricingKind: 'perShare', unit: 'USD' },
];

const BY_ID = new Map(VOLATILITY_ASSETS.map((a) => [a.id.toUpperCase(), a]));

export function getVolatilityEntry(symbol) {
  return BY_ID.get(String(symbol).trim().toUpperCase()) ?? null;
}

export function toYahooVolatilitySymbol(symbol) {
  return getVolatilityEntry(symbol)?.yahoo ?? String(symbol).trim();
}
