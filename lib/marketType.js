export function isMetalType(type) {
  return type === 'precious' || type === 'commodity' || type === 'metal';
}

export function isPreciousType(type) {
  return type === 'precious' || type === 'metal';
}

export function isCryptoType(type) {
  return type === 'crypto';
}

export function isEquityType(type) {
  return type === 'stock' || type === 'national';
}

export function isEtfType(type) {
  return type === 'etf';
}

export function isIndexType(type) {
  return type === 'index' || type === 'volatility';
}

export function isForexType(type) {
  return type === 'forex';
}

export function isYahooDirectType(type) {
  return ['index', 'forex', 'etf', 'volatility', 'rates', 'macro', 'sentiment'].includes(type);
}

export const MARKET_TYPES = [
  'stock',
  'national',
  'index',
  'forex',
  'commodity',
  'precious',
  'etf',
  'crypto',
  'volatility',
  'rates',
  'macro',
  'sentiment',
];
