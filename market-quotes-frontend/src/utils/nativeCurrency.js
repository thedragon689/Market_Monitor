import { usdToEur } from './format';

/** Valuta nativa coerente con lib/math/currency.js (backend). */
export function inferNativeCurrency(type, quote = null, symbol = null) {
  const fromQuote = quote?.currency;
  if (fromQuote) return String(fromQuote).toUpperCase();
  if (type === 'national') return 'EUR';
  const sym = String(symbol || quote?.symbol || '').toUpperCase();
  if (sym.endsWith('.MI') || sym.endsWith('.DE') || sym.endsWith('.PA')) return 'EUR';
  return 'USD';
}

/** Oggetto quote minimale per buildDisplayPricing da prezzo nativo (storico/previsioni). */
export function quoteFromNativePrice(nativePrice, currency = 'USD', fx = null) {
  if (nativePrice == null || !Number.isFinite(nativePrice)) return null;
  const ccy = String(currency).toUpperCase();
  if (ccy === 'EUR') {
    return {
      price: nativePrice,
      currency: 'EUR',
      priceEur: nativePrice,
      priceUsd: fx?.eurUsd ? nativePrice * fx.eurUsd : null,
    };
  }
  return {
    price: nativePrice,
    currency: 'USD',
    priceUsd: nativePrice,
    priceEur: fx?.eurUsd ? usdToEur(nativePrice, fx.eurUsd) : null,
  };
}
