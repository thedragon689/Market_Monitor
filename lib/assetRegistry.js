/** Metadati asset non-azione (sincronizzare con market-quotes-frontend/src/data/symbols.js). */

import { CRYPTO_ASSETS } from './cryptoRegistry.js';

export { CRYPTO_ASSETS } from './cryptoRegistry.js';

export const PRECIOUS_ASSETS = [
  { id: 'XAUUSD', name: 'Oro', family: 'Oro', hint: 'Spot oro', pricingKind: 'perGramTroy', unit: 'USD/oncia troy' },
  { id: 'XAGUSD', name: 'Argento', family: 'Argento', hint: 'Spot argento', pricingKind: 'perGramTroy', unit: 'USD/oncia troy' },
  { id: 'XPTUSD', name: 'Platino', family: 'Platino', hint: 'Spot platino', pricingKind: 'perGramTroy', unit: 'USD/oncia troy' },
  { id: 'XPDUSD', name: 'Palladio', family: 'Palladio', hint: 'Spot palladio', pricingKind: 'perGramTroy', unit: 'USD/oncia troy' },
];

export const COMMODITY_ASSETS = [
  { id: 'WTI', name: 'Petrolio WTI', family: 'Energia', hint: 'Futures petrolio', pricingKind: 'perBarrel', unit: 'USD/barile' },
  { id: 'COPPER', name: 'Rame', family: 'Industriale', hint: 'Futures rame', pricingKind: 'perGramLb', unit: 'USD/libbra' },
];

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
