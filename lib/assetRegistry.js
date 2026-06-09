/** Metadati asset non-azione (sincronizzare con market-quotes-frontend/src/data/symbols.js). */

import { CRYPTO_ASSETS } from './cryptoRegistry.js';
import { COMMODITY_REGISTRY } from './commodityRegistry.js';

export { CRYPTO_ASSETS } from './cryptoRegistry.js';

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

export function getAssetMeta(id, type) {
  if (type === 'crypto') return CRYPTO_ASSETS.find((a) => a.id === id);
  if (type === 'precious') return PRECIOUS_ASSETS.find((a) => a.id === id);
  if (type === 'commodity') return COMMODITY_ASSETS.find((a) => a.id === id);
  return null;
}

export function idsForType(type) {
  if (type === 'crypto') return CRYPTO_ASSETS.map((a) => a.id);
  if (type === 'precious') return PRECIOUS_ASSETS.map((a) => a.id);
  if (type === 'commodity') return COMMODITY_ASSETS.map((a) => a.id);
  return [];
}
