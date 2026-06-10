/** Tab bar mobile — Home, Mercati, Preferiti, Info (mockup eToro). */
export const MOBILE_NAV_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'markets', label: 'Mercati' },
  { id: 'favorites', label: 'Preferiti' },
  { id: 'info', label: 'Info' },
];

export function getMobileTabActive(view, mobileTab) {
  if (view === 'info') return 'info';
  return mobileTab || 'home';
}
