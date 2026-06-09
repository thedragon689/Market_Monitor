/** Tassi e obbligazioni — yield e ETF bond. */

export const RATES_ASSETS = [
  { id: '^TNX', yahoo: '^TNX', name: 'US 10Y Yield', hint: 'Rendimento Treasury 10 anni', pricingKind: 'perYield', unit: '%' },
  { id: '^FVX', yahoo: '^FVX', name: 'US 5Y Yield', hint: 'Rendimento Treasury 5 anni', pricingKind: 'perYield', unit: '%' },
  { id: '^TYX', yahoo: '^TYX', name: 'US 30Y Yield', hint: 'Rendimento Treasury 30 anni', pricingKind: 'perYield', unit: '%' },
  { id: 'TLT', yahoo: 'TLT', name: 'iShares 20+ Year Treasury', hint: 'ETF Treasury long duration', pricingKind: 'perShare', unit: 'USD' },
  { id: 'IEF', yahoo: 'IEF', name: 'iShares 7-10 Year Treasury', hint: 'ETF Treasury medio termine', pricingKind: 'perShare', unit: 'USD' },
  { id: 'SHY', yahoo: 'SHY', name: 'iShares 1-3 Year Treasury', hint: 'ETF Treasury breve', pricingKind: 'perShare', unit: 'USD' },
  { id: 'LQD', yahoo: 'LQD', name: 'iShares IG Corporate', hint: 'Obbligazioni investment grade', pricingKind: 'perShare', unit: 'USD' },
  { id: 'HYG', yahoo: 'HYG', name: 'iShares High Yield', hint: 'Obbligazioni high yield', pricingKind: 'perShare', unit: 'USD' },
];

const BY_ID = new Map(RATES_ASSETS.map((a) => [a.id.toUpperCase(), a]));

export function getRatesEntry(symbol) {
  return BY_ID.get(String(symbol).trim().toUpperCase()) ?? null;
}

export function toYahooRatesSymbol(symbol) {
  return getRatesEntry(symbol)?.yahoo ?? String(symbol).trim();
}
