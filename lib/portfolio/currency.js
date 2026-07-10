import { usdToEur } from '../fx.js';

export const BASE_CURRENCY = 'EUR';

/** Converte un importo nella valuta base del portfolio (EUR). */
export function toBaseCurrency(amount, currency, fx) {
  if (amount == null || !Number.isFinite(amount)) return null;
  const ccy = String(currency || 'USD').toUpperCase();
  if (ccy === BASE_CURRENCY) return amount;
  if (ccy === 'USD') {
    if (!fx?.eurUsd) return null;
    return usdToEur(amount, fx.eurUsd);
  }
  return null;
}

export function inferPositionCurrency(quote, assetType, symbol) {
  if (quote?.currency) return String(quote.currency).toUpperCase();
  if (assetType === 'national') return 'EUR';
  const sym = String(symbol || '').toUpperCase();
  if (sym.endsWith('.MI') || sym.endsWith('.DE') || sym.endsWith('.PA') || sym.endsWith('.L')) {
    return 'EUR';
  }
  return 'USD';
}
