/** Coppie Forex — Yahoo formato EURUSD=X. */

export const FOREX_ASSETS = [
  { id: 'EURUSD', yahoo: 'EURUSD=X', name: 'EUR/USD', hint: 'Euro / Dollaro', pricingKind: 'perPair', unit: 'USD per EUR' },
  { id: 'GBPUSD', yahoo: 'GBPUSD=X', name: 'GBP/USD', hint: 'Sterlina / Dollaro', pricingKind: 'perPair', unit: 'USD per GBP' },
  { id: 'USDJPY', yahoo: 'USDJPY=X', name: 'USD/JPY', hint: 'Dollaro / Yen', pricingKind: 'perPair', unit: 'JPY per USD' },
  { id: 'USDCHF', yahoo: 'USDCHF=X', name: 'USD/CHF', hint: 'Dollaro / Franco svizzero', pricingKind: 'perPair', unit: 'CHF per USD' },
  { id: 'AUDUSD', yahoo: 'AUDUSD=X', name: 'AUD/USD', hint: 'Dollaro australiano', pricingKind: 'perPair', unit: 'USD per AUD' },
  { id: 'USDCAD', yahoo: 'USDCAD=X', name: 'USD/CAD', hint: 'Dollaro / Dollaro canadese', pricingKind: 'perPair', unit: 'CAD per USD' },
  { id: 'NZDUSD', yahoo: 'NZDUSD=X', name: 'NZD/USD', hint: 'Dollaro neozelandese', pricingKind: 'perPair', unit: 'USD per NZD' },
  { id: 'EURGBP', yahoo: 'EURGBP=X', name: 'EUR/GBP', hint: 'Euro / Sterlina', pricingKind: 'perPair', unit: 'GBP per EUR' },
  { id: 'EURJPY', yahoo: 'EURJPY=X', name: 'EUR/JPY', hint: 'Euro / Yen', pricingKind: 'perPair', unit: 'JPY per EUR' },
];

const BY_ID = new Map(FOREX_ASSETS.map((a) => [a.id.toUpperCase(), a]));

export function getForexEntry(symbol) {
  return BY_ID.get(String(symbol).replace(/=X$/i, '').toUpperCase()) ?? null;
}

export function toYahooForexSymbol(symbol) {
  const entry = getForexEntry(symbol);
  if (entry?.yahoo) return entry.yahoo;
  const id = String(symbol).replace(/=X$/i, '').toUpperCase();
  return `${id}=X`;
}

export function toStooqForexSymbol(symbol) {
  const entry = getForexEntry(symbol);
  const id = entry?.id ?? String(symbol).replace(/=X$/i, '').toUpperCase();
  return id.toLowerCase();
}
