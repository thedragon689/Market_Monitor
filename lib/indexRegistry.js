/** Indici globali — Yahoo ticker (es. ^GSPC). */

export const INDEX_ASSETS = [
  { id: '^GSPC', yahoo: '^GSPC', name: 'S&P 500', hint: 'USA · large cap', region: 'USA', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^IXIC', yahoo: '^IXIC', name: 'Nasdaq Composite', hint: 'USA · tech-heavy', region: 'USA', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^DJI', yahoo: '^DJI', name: 'Dow Jones', hint: 'USA · 30 titoli', region: 'USA', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^FTSE', yahoo: '^FTSE', name: 'FTSE 100', hint: 'Regno Unito', region: 'UK', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^GDAXI', yahoo: '^GDAXI', name: 'DAX', hint: 'Germania', region: 'EU', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^FCHI', yahoo: '^FCHI', name: 'CAC 40', hint: 'Francia', region: 'EU', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^STOXX50E', yahoo: '^STOXX50E', name: 'Euro Stoxx 50', hint: 'Eurozona', region: 'EU', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^N225', yahoo: '^N225', name: 'Nikkei 225', hint: 'Giappone', region: 'Asia', pricingKind: 'perIndex', unit: 'punti' },
  { id: '^HSI', yahoo: '^HSI', name: 'Hang Seng', hint: 'Hong Kong', region: 'Asia', pricingKind: 'perIndex', unit: 'punti' },
];

const BY_ID = new Map(INDEX_ASSETS.map((a) => [a.id.toUpperCase(), a]));

export function getIndexEntry(symbol) {
  return BY_ID.get(String(symbol).trim().toUpperCase()) ?? null;
}

export function toYahooIndexSymbol(symbol) {
  return getIndexEntry(symbol)?.yahoo ?? String(symbol).trim();
}
