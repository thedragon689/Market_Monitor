/**
 * Mappa intent di navigazione → view + tab mobile.
 * Usata da handleQuickNav / drawer / ProNav per CTA coerenti.
 */
export function resolveMobileNavIntent({ view, type, navId } = {}) {
  if (view === 'info') {
    return { view: 'info', mobileTab: null, mobileSearchFocus: false };
  }
  if (view === 'forecast') {
    return { view: 'forecast', mobileTab: null, mobileSearchFocus: false };
  }
  if (view === 'analysis' || view === 'advice') {
    return { view, mobileTab: null, mobileSearchFocus: false };
  }
  if (view === 'explore') {
    const openMarkets = Boolean(type) || (navId && navId !== 'home');
    return {
      view: 'explore',
      mobileTab: openMarkets ? 'markets' : 'home',
      mobileSearchFocus: false,
      type: type || undefined,
    };
  }
  return null;
}

/** Tab bottom bar → view */
export function resolveMobileTabIntent(tab) {
  if (tab === 'info') return { view: 'info' };
  return { view: 'explore', mobileTab: tab, mobileSearchFocus: false };
}
