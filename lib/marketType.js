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
