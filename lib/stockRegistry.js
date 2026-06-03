/**
 * Registro titoli: id usato in API/UI, simbolo Yahoo per storico, Stooq per quotazione rapida.
 * Sincronizzato con market-quotes-frontend/src/data/symbols.js
 */

const us = (row) => ({ ...row, region: 'USA', market: 'US' });
const eu = (row) => ({ ...row, region: 'Europa', market: 'EU' });
const af = (row) => ({ ...row, region: 'Africa', market: 'AF' });

export const US_STOCKS = [
  us({ id: 'AAPL', yahoo: 'AAPL', name: 'Apple', hint: 'Tech · USA', sector: 'Tech' }),
  us({ id: 'MSFT', yahoo: 'MSFT', name: 'Microsoft', hint: 'Software · USA', sector: 'Tech' }),
  us({ id: 'GOOGL', yahoo: 'GOOGL', name: 'Alphabet', hint: 'Google · USA', sector: 'Tech' }),
  us({ id: 'AMZN', yahoo: 'AMZN', name: 'Amazon', hint: 'E-commerce · USA', sector: 'Tech' }),
  us({ id: 'META', yahoo: 'META', name: 'Meta', hint: 'Social · USA', sector: 'Tech' }),
  us({ id: 'NVDA', yahoo: 'NVDA', name: 'Nvidia', hint: 'Chip · USA', sector: 'Tech' }),
  us({ id: 'TSLA', yahoo: 'TSLA', name: 'Tesla', hint: 'Auto · USA', sector: 'Auto' }),
  us({ id: 'JPM', yahoo: 'JPM', name: 'JPMorgan', hint: 'Banca · USA', sector: 'Finanza' }),
  us({ id: 'V', yahoo: 'V', name: 'Visa', hint: 'Pagamenti · USA', sector: 'Finanza' }),
  us({ id: 'XOM', yahoo: 'XOM', name: 'Exxon Mobil', hint: 'Energia · USA', sector: 'Energia' }),
  us({
    id: 'IOR',
    yahoo: 'IOR',
    name: 'IOR',
    hint: 'Income Opportunity Realty Investors · NYSE American',
    sector: 'Real Estate',
  }),
];

export const EU_STOCKS = [
  eu({ id: 'SAP.DE', yahoo: 'SAP.DE', name: 'SAP', hint: 'Software · Germania', sector: 'Tech' }),
  eu({
    id: 'ASML.AS',
    yahoo: 'ASML.AS',
    name: 'ASML',
    hint: 'Semiconduttori · Paesi Bassi',
    sector: 'Tech',
  }),
  eu({ id: 'MC.PA', yahoo: 'MC.PA', name: 'LVMH', hint: 'Lusso · Francia', sector: 'Consumer' }),
  eu({ id: 'BMW.DE', yahoo: 'BMW.DE', name: 'BMW', hint: 'Auto · Germania', sector: 'Auto' }),
  eu({
    id: 'NESN.SW',
    yahoo: 'NESN.SW',
    name: 'Nestlé',
    hint: 'Consumer · Svizzera',
    sector: 'Consumer',
  }),
  eu({
    id: 'TTE.PA',
    yahoo: 'TTE.PA',
    name: 'TotalEnergies',
    hint: 'Energia · Francia',
    sector: 'Energia',
  }),
  eu({
    id: 'AIR.PA',
    yahoo: 'AIR.PA',
    name: 'Airbus',
    hint: 'Aerospazio · Francia',
    sector: 'Industriale',
  }),
  eu({
    id: 'SAN.MC',
    yahoo: 'SAN.MC',
    name: 'Santander',
    hint: 'Banca · Spagna',
    sector: 'Finanza',
  }),
];

export const AFRICA_STOCKS = [
  af({
    id: 'GFI',
    yahoo: 'GFI',
    name: 'Gold Fields',
    hint: 'Oro · Sudafrica (ADR)',
    sector: 'Mining',
  }),
  af({
    id: 'SSL',
    yahoo: 'SSL',
    name: 'Sasol',
    hint: 'Energia · Sudafrica (ADR)',
    sector: 'Energia',
  }),
  af({
    id: 'NPSNY',
    yahoo: 'NPSNY',
    name: 'Naspers',
    hint: 'Tech · Sudafrica (ADR)',
    sector: 'Tech',
  }),
  af({
    id: 'ANGPY',
    yahoo: 'ANGPY',
    name: 'Anglo American',
    hint: 'Mining · Africa (ADR)',
    sector: 'Mining',
  }),
  af({
    id: 'MTNOY',
    yahoo: 'MTNOY',
    name: 'MTN Group',
    hint: 'Telecom · Africa (ADR)',
    sector: 'Telecom',
  }),
  af({
    id: 'DRD',
    yahoo: 'DRD',
    name: 'DRDGOLD',
    hint: 'Oro · Sudafrica (ADR)',
    sector: 'Mining',
  }),
];

export const STOCK_SYMBOLS = [...US_STOCKS, ...EU_STOCKS, ...AFRICA_STOCKS];

const BY_ID = new Map(STOCK_SYMBOLS.map((s) => [s.id.toUpperCase(), s]));

export function getStockEntry(symbol) {
  return BY_ID.get(String(symbol).trim().toUpperCase()) ?? null;
}

/** Simbolo Yahoo Finance (storico / chart). */
export function toYahooStockSymbol(symbol) {
  const entry = getStockEntry(symbol);
  if (entry?.yahoo) return entry.yahoo;
  return String(symbol).trim().toUpperCase();
}

/**
 * Ticker Stooq (latest batch API).
 * USA/ADR senza suffisso → `ticker.us`; borse EU → suffisso exchange minuscolo (es. `sap.de`).
 */
export function toStooqStockSymbol(symbol) {
  const entry = getStockEntry(symbol);
  if (entry?.stooq) return String(entry.stooq).toLowerCase();

  const id = String(symbol).trim();
  if (!id.includes('.')) {
    return `${id.toLowerCase()}.us`;
  }
  return id.toLowerCase();
}
