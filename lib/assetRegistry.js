/** Metadati asset — sincronizzare con market-quotes-frontend/src/data/symbols.js */

import { CRYPTO_ASSETS } from './cryptoRegistry.js';
import { COMMODITY_REGISTRY } from './commodityRegistry.js';
import { INDEX_ASSETS } from './indexRegistry.js';
import { FOREX_ASSETS } from './forexRegistry.js';
import { ETF_ASSETS } from './etfRegistry.js';
import { VOLATILITY_ASSETS } from './volatilityRegistry.js';
import { RATES_ASSETS } from './ratesRegistry.js';
import { MACRO_ASSETS } from './macroRegistry.js';
import { SENTIMENT_ASSETS } from './sentimentRegistry.js';

export { CRYPTO_ASSETS } from './cryptoRegistry.js';
export { INDEX_ASSETS } from './indexRegistry.js';
export { FOREX_ASSETS } from './forexRegistry.js';
export { ETF_ASSETS } from './etfRegistry.js';
export { VOLATILITY_ASSETS } from './volatilityRegistry.js';
export { RATES_ASSETS } from './ratesRegistry.js';
export { MACRO_ASSETS } from './macroRegistry.js';
export { SENTIMENT_ASSETS } from './sentimentRegistry.js';

export const PRECIOUS_ASSETS = [
  { id: 'XAUUSD', name: 'Oro', family: 'Oro', hint: 'Spot oro', pricingKind: 'perGramTroy', unit: 'USD/oncia troy' },
  { id: 'XAGUSD', name: 'Argento', family: 'Argento', hint: 'Spot argento', pricingKind: 'perGramTroy', unit: 'USD/oncia troy' },
  { id: 'XPTUSD', name: 'Platino', family: 'Platino', hint: 'Spot platino', pricingKind: 'perGramTroy', unit: 'USD/oncia troy' },
  { id: 'XPDUSD', name: 'Palladio', family: 'Palladio', hint: 'Spot palladio', pricingKind: 'perGramTroy', unit: 'USD/oncia troy' },
];

export const COMMODITY_ASSETS = COMMODITY_REGISTRY.map((c) => ({
  id: c.id,
  name: c.name,
  family: c.family,
  hint: c.hint,
  pricingKind: c.pricingKind,
  unit: c.unit,
}));

const REGISTRY_BY_TYPE = {
  crypto: CRYPTO_ASSETS,
  precious: PRECIOUS_ASSETS,
  commodity: COMMODITY_ASSETS,
  index: INDEX_ASSETS,
  forex: FOREX_ASSETS,
  etf: ETF_ASSETS,
  volatility: VOLATILITY_ASSETS,
  rates: RATES_ASSETS,
  macro: MACRO_ASSETS,
  sentiment: SENTIMENT_ASSETS,
};

export function getAssetMeta(id, type) {
  const list = REGISTRY_BY_TYPE[type];
  if (!list) return null;
  const key = String(id).toUpperCase();
  return list.find((a) => a.id.toUpperCase() === key) ?? null;
}

export function idsForType(type) {
  const list = REGISTRY_BY_TYPE[type];
  return list ? list.map((a) => a.id) : [];
}

export function assetsForType(type) {
  return REGISTRY_BY_TYPE[type] ?? [];
}
