/** ETF — quotati come azioni USA (Yahoo / Stooq .US). */

export const ETF_ASSETS = [
  { id: 'SPY', yahoo: 'SPY', name: 'SPDR S&P 500', hint: 'Large cap USA', sector: 'Broad', pricingKind: 'perShare', unit: 'USD' },
  { id: 'QQQ', yahoo: 'QQQ', name: 'Invesco QQQ', hint: 'Nasdaq 100', sector: 'Tech', pricingKind: 'perShare', unit: 'USD' },
  { id: 'IWM', yahoo: 'IWM', name: 'Russell 2000', hint: 'Small cap USA', sector: 'Broad', pricingKind: 'perShare', unit: 'USD' },
  { id: 'VTI', yahoo: 'VTI', name: 'Vanguard Total Stock', hint: 'Mercato USA totale', sector: 'Broad', pricingKind: 'perShare', unit: 'USD' },
  { id: 'EFA', yahoo: 'EFA', name: 'iShares MSCI EAFE', hint: 'Azioni sviluppate ex-USA', sector: 'International', pricingKind: 'perShare', unit: 'USD' },
  { id: 'EEM', yahoo: 'EEM', name: 'iShares MSCI Emerging', hint: 'Mercati emergenti', sector: 'EM', pricingKind: 'perShare', unit: 'USD' },
  { id: 'GLD', yahoo: 'GLD', name: 'SPDR Gold Shares', hint: 'Oro fisico', sector: 'Commodity', pricingKind: 'perShare', unit: 'USD' },
  { id: 'SLV', yahoo: 'SLV', name: 'iShares Silver', hint: 'Argento fisico', sector: 'Commodity', pricingKind: 'perShare', unit: 'USD' },
  { id: 'USO', yahoo: 'USO', name: 'United States Oil', hint: 'Petrolio WTI', sector: 'Energy', pricingKind: 'perShare', unit: 'USD' },
  { id: 'XLE', yahoo: 'XLE', name: 'Energy Select SPDR', hint: 'Settore energia USA', sector: 'Energy', pricingKind: 'perShare', unit: 'USD' },
  { id: 'XLK', yahoo: 'XLK', name: 'Technology Select SPDR', hint: 'Settore tech USA', sector: 'Tech', pricingKind: 'perShare', unit: 'USD' },
];

const BY_ID = new Map(ETF_ASSETS.map((a) => [a.id.toUpperCase(), a]));

export function getEtfEntry(symbol) {
  return BY_ID.get(String(symbol).trim().toUpperCase()) ?? null;
}

export function toYahooEtfSymbol(symbol) {
  return getEtfEntry(symbol)?.yahoo ?? String(symbol).trim().toUpperCase();
}
