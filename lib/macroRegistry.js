/** Macro — proxy ETF e indici (CPI/PPI via proxy, non serie FRED dirette). */

export const MACRO_ASSETS = [
  { id: 'DX-Y.NYB', yahoo: 'DX-Y.NYB', name: 'US Dollar Index', hint: 'DXY · forza del dollaro', pricingKind: 'perIndex', unit: 'punti' },
  { id: 'TIP', yahoo: 'TIP', name: 'iShares TIPS', hint: 'Proxy inflazione · Treasury indicizzati', pricingKind: 'perShare', unit: 'USD' },
  { id: 'RINF', yahoo: 'RINF', name: 'ProShares Inflation Expectations', hint: 'Aspettative inflazione', pricingKind: 'perShare', unit: 'USD' },
  { id: 'UUP', yahoo: 'UUP', name: 'Invesco DB USD Index', hint: 'ETF dollaro USA', pricingKind: 'perShare', unit: 'USD' },
  { id: 'CPER', yahoo: 'CPER', name: 'United States Copper', hint: 'Proxy domanda industriale globale', pricingKind: 'perShare', unit: 'USD' },
  { id: 'DBC', yahoo: 'DBC', name: 'Invesco DB Commodity', hint: 'Paniere commodities', pricingKind: 'perShare', unit: 'USD' },
];

const BY_ID = new Map(MACRO_ASSETS.map((a) => [a.id.toUpperCase(), a]));

export function getMacroEntry(symbol) {
  return BY_ID.get(String(symbol).trim().toUpperCase()) ?? null;
}

export function toYahooMacroSymbol(symbol) {
  return getMacroEntry(symbol)?.yahoo ?? String(symbol).trim();
}
