/** Sentiment — proxy risk-on / risk-off (integra con news geo in analisi). */

export const SENTIMENT_ASSETS = [
  { id: '^VIX', yahoo: '^VIX', name: 'VIX · Fear gauge', hint: 'Paura di mercato', pricingKind: 'perIndex', unit: 'punti' },
  { id: 'HYG', yahoo: 'HYG', name: 'High Yield · Risk appetite', hint: 'Appetito al rischio creditizio', pricingKind: 'perShare', unit: 'USD' },
  { id: 'IWM', yahoo: 'IWM', name: 'Russell 2000 · Small cap', hint: 'Risk-on domestico USA', pricingKind: 'perShare', unit: 'USD' },
  { id: 'ARKK', yahoo: 'ARKK', name: 'ARK Innovation', hint: 'Growth / sentiment tech', pricingKind: 'perShare', unit: 'USD' },
  { id: 'GLD', yahoo: 'GLD', name: 'Gold · Safe haven', hint: 'Rifugio sicuro', pricingKind: 'perShare', unit: 'USD' },
];

const BY_ID = new Map(SENTIMENT_ASSETS.map((a) => [a.id.toUpperCase(), a]));

export function getSentimentEntry(symbol) {
  return BY_ID.get(String(symbol).trim().toUpperCase()) ?? null;
}

export function toYahooSentimentSymbol(symbol) {
  return getSentimentEntry(symbol)?.yahoo ?? String(symbol).trim();
}
