import { MARKET_TYPES } from '../marketType.js';

/** Inferisce il tipo mercato dal simbolo se non fornito dal client. */
export function inferAssetType(symbol, hint) {
  if (hint && MARKET_TYPES.includes(hint)) return hint;

  const s = String(symbol).trim().toUpperCase();
  if (!s) return 'stock';

  if (s.includes('-USD') || s === 'BTC' || s === 'ETH') return 'crypto';
  if (s.startsWith('^')) return 'index';
  if (s === 'XAUUSD' || s === 'XAGUSD') return 'precious';
  if (['WTI', 'BRENT', 'COPPER', 'NATGAS'].includes(s)) return 'commodity';
  if (/^[A-Z]{6}$/.test(s) && (s.includes('USD') || s.includes('EUR') || s.includes('JPY'))) {
    return 'forex';
  }
  if (s.endsWith('.MI') || s.endsWith('.DE') || s.endsWith('.PA') || s.endsWith('.L')) {
    return 'national';
  }
  return 'stock';
}
