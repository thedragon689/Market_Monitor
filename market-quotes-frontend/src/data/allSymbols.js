import { getSymbolsForType } from './symbols';

/** Tipi di mercato ricercabili (allineati a lib/marketType.js). */
export const SEARCHABLE_TYPES = [
  'stock',
  'national',
  'index',
  'forex',
  'commodity',
  'precious',
  'etf',
  'crypto',
  'volatility',
  'rates',
  'macro',
  'sentiment',
];

export const TYPE_LABELS = {
  stock: 'Azioni',
  national: 'Borsa Italiana',
  index: 'Indici',
  forex: 'Forex',
  commodity: 'Materie prime',
  precious: 'Metalli preziosi',
  etf: 'ETF',
  crypto: 'Crypto',
  volatility: 'Volatilità',
  rates: 'Tassi',
  macro: 'Macro',
  sentiment: 'Sentiment',
};

/** Lista piatta di tutti i simboli { symbol, type, name, hint } per la ricerca. */
export const ALL_SYMBOLS = SEARCHABLE_TYPES.flatMap((type) =>
  getSymbolsForType(type).map((s) => ({
    symbol: s.id,
    type,
    name: s.name || s.id,
    hint: s.hint || '',
  }))
);
