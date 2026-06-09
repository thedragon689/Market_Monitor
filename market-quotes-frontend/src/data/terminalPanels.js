/** Definizione pannelli dashboard terminal (stile Bloomberg). */

export const TERMINAL_CHART_COLORS = [
  '#6366f1',
  '#0d9488',
  '#d97706',
  '#9333ea',
  '#0891b2',
  '#e11d48',
];

export const TERMINAL_LEFT_PANELS = [
  {
    id: 'indices',
    title: 'Indici globali',
    catalogKey: 'index',
    assetType: 'index',
    defaultPick: ['^GSPC', '^IXIC', '^DJI', '^VIX'],
  },
  {
    id: 'sectors',
    title: 'Settori ETF',
    catalogKey: 'etf',
    assetType: 'etf',
    sectorOnly: true,
  },
  {
    id: 'rates',
    title: 'Tassi e obbligazioni',
    catalogKey: 'rates',
    assetType: 'rates',
  },
];

export const TERMINAL_RIGHT_PANELS = [
  {
    id: 'forex',
    title: 'Valute',
    catalogKey: 'forex',
    assetType: 'forex',
  },
  {
    id: 'global',
    title: 'Mercati globali',
    catalogKey: 'index',
    assetType: 'index',
    skipIds: ['^GSPC', '^IXIC', '^DJI'],
  },
  {
    id: 'commodities',
    title: 'Materie prime',
    catalogKey: 'commodity',
    assetType: 'commodity',
  },
];

/** Griglia heatmap settori (ETF SPDR / simili). */
export const TERMINAL_HEATMAP_CELLS = [
  { id: 'XLK', label: 'Tech', sector: 'Tech' },
  { id: 'XLE', label: 'Energy', sector: 'Energy' },
  { id: 'XLF', label: 'Financial', sector: 'Financial' },
  { id: 'XLV', label: 'Health', sector: 'Health' },
  { id: 'XLI', label: 'Industrial', sector: 'Industrial' },
  { id: 'XLP', label: 'Staples', sector: 'Staples' },
  { id: 'XLY', label: 'Discret.', sector: 'Consumer' },
  { id: 'XLB', label: 'Materials', sector: 'Materials' },
  { id: 'XLU', label: 'Utilities', sector: 'Utilities' },
];

export const TERMINAL_RAIL_LEFT = [
  { id: 'indices', icon: '◎', label: 'Indici' },
  { id: 'sectors', icon: '▦', label: 'Settori' },
  { id: 'rates', icon: '⎓', label: 'Tassi' },
];

export const TERMINAL_RAIL_RIGHT = [
  { id: 'forex', icon: '¤', label: 'Forex' },
  { id: 'commodities', icon: '▲', label: 'Commod.' },
  { id: 'crypto', icon: '₿', label: 'Crypto' },
];

export const DEFAULT_CHART_PICKS = [
  { id: '^GSPC', type: 'index', name: 'S&P 500' },
  { id: '^IXIC', type: 'index', name: 'Nasdaq' },
  { id: '^DJI', type: 'index', name: 'Dow Jones' },
];
