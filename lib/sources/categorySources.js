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
  index: {
    label: 'Indici globali',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'primary' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
    ],
  },
  forex: {
    label: 'Forex',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'primary' },
      { id: 'stooq', label: 'Stooq FX', role: 'fallback' },
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
  etf: {
    label: 'ETF',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'primary' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
    ],
  },
  volatility: {
    label: 'Volatilità',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'primary' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
    ],
  },
  rates: {
    label: 'Tassi e obbligazioni',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'primary' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
    ],
  },
  macro: {
    label: 'Macro',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'primary' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
    ],
  },
  sentiment: {
    label: 'Sentiment',
    providers: [
      { id: 'yahoo-finance', label: 'Yahoo Finance', role: 'primary' },
      { id: 'stooq', label: 'Stooq', role: 'fallback' },
    ],
  },
};

export function getCategorySourceConfig(type) {
  return CATEGORY_SOURCES[type] ?? CATEGORY_SOURCES.stock;
}
