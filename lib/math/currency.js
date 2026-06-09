/** Valuta nativa delle quotazioni per conversioni coerenti. */

export function inferQuoteCurrency(type, quote = null, symbol = null) {
  const fromQuote = quote?.currency;
  if (fromQuote) return String(fromQuote).toUpperCase();
  if (type === 'national') return 'EUR';
  const sym = String(symbol || quote?.symbol || '').toUpperCase();
  if (sym.endsWith('.MI') || sym.endsWith('.DE') || sym.endsWith('.PA')) return 'EUR';
  return 'USD';
}
