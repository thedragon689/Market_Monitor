import { loadMarketDataMulti } from './sources/loadMarketMulti.js';

export { toYahooSymbol, YAHOO_SYMBOL_MAP } from './yahooProviders.js';

/** Carica mercato provando tutte le fonti configurate per la categoria. */
export async function loadMarketData(displaySymbol, type) {
  return loadMarketDataMulti(displaySymbol, type);
}
