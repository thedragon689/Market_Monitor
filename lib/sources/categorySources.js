/**
 * Fonti dati per categoria — ordine di tentativo e metadati UI.
 */
export const CATEGORY_SOURCES = {
  stock: {
    label: 'Azioni internazionali',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'primary' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
      { id: 'alphavantage', label: 'Alpha Vantage', role: 'fallback' },
    ],
  },
  national: {
    label: 'Azioni Italia',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'primary' },
      { id: 'stooq', label: 'Stooq (.it)', role: 'fallback' },
    ],
  },
  crypto: {
    label: 'Criptovalute',
    providers: [
      { id: 'binance+kraken', label: 'Binance + Kraken', role: 'primary' },
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'fallback' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
    ],
  },
  precious: {
    label: 'Metalli preziosi',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Futures', role: 'primary' },
      { id: 'fcsapi', label: 'FCS API', role: 'fallback' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
      { id: 'alphavantage', label: 'Alpha Vantage', role: 'fallback' },
    ],
  },
  commodity: {
    label: 'Materie prime',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Futures', role: 'primary' },
      { id: 'fcsapi', label: 'FCS API', role: 'fallback' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
      { id: 'alphavantage', label: 'Alpha Vantage', role: 'fallback' },
    ],
  },
};

export function getCategorySourceConfig(type) {
  return CATEGORY_SOURCES[type] ?? CATEGORY_SOURCES.stock;
}
