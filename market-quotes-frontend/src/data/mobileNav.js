/** Tab bar mobile — Home, Mercati, Watchlist, Portfolio, Info */
export const MOBILE_NAV_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'markets', label: 'Mercati' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'info', label: 'Info' },
];

export function getMobileTabActive(view, mobileTab) {
  if (view === 'info') return 'info';
  if (view === 'portfolio') return 'portfolio';
  if (view === 'watchlist') return 'watchlist';
  return mobileTab || 'home';
}
