/** Voci navbar professionale (TradingView-style). */
export const PRO_NAV_ITEMS = [
  { id: 'home', label: 'Home', view: 'explore' },
  { id: 'crypto', label: 'Crypto', view: 'explore', type: 'crypto' },
  { id: 'index', label: 'Indici', view: 'explore', type: 'index' },
  { id: 'commodity', label: 'Materie Prime', view: 'explore', type: 'commodity' },
  { id: 'forex', label: 'Forex', view: 'explore', type: 'forex' },
  { id: 'etf', label: 'ETF', view: 'explore', type: 'etf' },
  { id: 'macro', label: 'Macro', view: 'explore', type: 'macro' },
  { id: 'forecast', label: 'Previsioni', view: 'forecast' },
  { id: 'info', label: 'Info', view: 'info' },
];

export function isProNavActive(item, view, type) {
  if (item.view === 'info') return view === 'info';
  if (item.id === 'home') return view === 'explore';
  if (item.type) return view === 'explore' && type === item.type;
  if (item.view === 'forecast') return view === 'forecast';
  return view === item.view;
}
