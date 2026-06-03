import { getEurUsdRate, usdToEur } from './fx.js';

export { getEurUsdRate, usdToEur };

export function enrichQuoteWithEur(quote, fx) {
  if (!quote) return quote;
  const ccy = (quote.currency || 'USD').toUpperCase();

  if (ccy === 'EUR') {
    return {
      ...quote,
      priceEur: quote.price,
      priceUsd: fx?.eurUsd ? quote.price * fx.eurUsd : null,
      changeEur: quote.change,
      changeUsd: quote.change != null && fx?.eurUsd ? quote.change * fx.eurUsd : null,
    };
  }

  if (!fx?.eurUsd) return quote;
  return {
    ...quote,
    priceEur: usdToEur(quote.price, fx.eurUsd),
    priceUsd: quote.price,
    changeEur: quote.change != null ? usdToEur(quote.change, fx.eurUsd) : null,
    changeUsd: quote.change,
  };
}
