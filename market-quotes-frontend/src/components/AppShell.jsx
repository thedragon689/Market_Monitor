import { useEffect, useRef, useState } from 'react';
import CategorySelector from './CategorySelector';
import AppLogo from './AppLogo';
import AssetSwitcher from './AssetSwitcher';
import BottomNavIcon from './BottomNavIcon';
import Breadcrumbs from './Breadcrumbs';
import ProNavbar from './ProNavbar';
import MobileNavDrawer from './MobileNavDrawer';
import MobileSearchMenu from './MobileSearchMenu';
import { MenuIcon, SearchIcon } from './icons/HeaderIcons';
import { getCategoryMeta } from '../data/categories';
import { APP_VIEWS, getViewIndex } from '../data/views';
import { MOBILE_NAV_TABS, getMobileTabActive } from '../data/mobileNav';

export default function AppShell({
  view,
  onViewChange,
  type,
  onTypeChange,
  symbol,
  assetName,
  categorySummary,
  onGoForecast,
  onRefresh,
  loadingForecast,
  loadingMarket,
  isLoading,
  themeToggle,
  theme = 'dark',
  onQuickNav,
  onInternalSection,
  onSymbolChange,
  dataFreshKey = 0,
  isMobile = false,
  isTerminalExplore = false,
  mobileTab = 'home',
  onMobileTabChange,
  onMobileSearchAction,
  onSelectAsset,
  catalog,
  fx,
  children,
}) {
  const isMobileExplore = isMobile && view === 'explore';
  const isMobileHomeShell = isMobile && (view === 'explore' || view === 'info');
  const mobileNavActive = getMobileTabActive(view, mobileTab);
  const isWorkflowView = view === 'analysis' || view === 'advice' || view === 'forecast';
  const headerRef = useRef(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const sync = () => {
      document.documentElement.style.setProperty(
        '--app-shell-header-h',
        `${el.getBoundingClientRect().height}px`
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener('resize', sync);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [view, isMobile, isTerminalExplore, symbol, type]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const categoryMeta = getCategoryMeta(type);
  const viewIdx = getViewIndex(view);

  const handleBreadcrumb = ({ view: nextView, type: nextType }) => {
    if (onQuickNav && (nextView || nextType)) {
      onQuickNav({ view: nextView, type: nextType });
      return;
    }
    if (nextView) onViewChange(nextView);
    if (nextType && nextType !== type) onTypeChange(nextType);
  };

  const handleQuickNav = ({ view: nextView, type: nextType }) => {
    if (onQuickNav) {
      onQuickNav({ view: nextView, type: nextType });
      return;
    }
    if (nextView) onViewChange(nextView);
    if (nextType) onTypeChange(nextType);
  };

  return (
    <div
      className={`app-shell ${isMobileExplore ? 'app-shell--mobile-explore' : ''} ${isMobileHomeShell ? 'app-shell--mobile-home' : ''} ${isMobile ? 'app-shell--mobile' : ''} ${isTerminalExplore ? 'app-shell--terminal' : ''} ${isWorkflowView ? 'app-shell--workflow' : ''}`}
    >
      <header
        ref={headerRef}
        className="app-shell__header app-shell__header--sticky"
      >
        <div
          className={`app-shell__brand ${isMobile ? 'app-shell__brand--mobile' : ''}`}
        >
          {isMobile ? (
            <>
              <button
                type="button"
                className="app-shell__menu-btn"
                aria-label="Apri menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(true)}
              >
                <MenuIcon size={22} />
              </button>
              <div className="app-shell__mobile-title-wrap">
                <h1 className="app-shell__mobile-title">Market Monitor</h1>
              </div>
              <div className="app-shell__mobile-actions">
                <button
                  type="button"
                  className="app-shell__search-btn"
                  aria-label="Cerca asset"
                  aria-expanded={searchMenuOpen}
                  onClick={() => setSearchMenuOpen(true)}
                >
                  <SearchIcon size={20} />
                </button>
                <span className="app-shell__theme-wrap">{themeToggle}</span>
              </div>
            </>
          ) : (
            <>
              <span className="app-shell__logo-wrap">
                <AppLogo className="app-shell__logo" size={56} theme={theme} />
              </span>
              <div>
                <strong className="app-shell__title">Market Monitor</strong>
                <span className="app-shell__tagline">Quotazioni · Analisi · Previsioni</span>
              </div>
              {themeToggle}
            </>
          )}
        </div>

        <nav
          className="app-shell__nav app-shell__nav--steps app-shell__nav--desktop"
          aria-label="Passaggi principali"
        >
          {APP_VIEWS.map((v, i) => {
            const done = i < viewIdx;
            return (
              <button
                key={v.id}
                type="button"
                className={`app-shell__tab ${view === v.id ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
                onClick={() => (v.id === 'forecast' ? onGoForecast() : onViewChange(v.id))}
                aria-current={view === v.id ? 'page' : undefined}
              >
                <span className="app-shell__tab-step">{v.step}</span>
                <span className="app-shell__tab-label">{v.label}</span>
                <span className="app-shell__tab-hint">{v.hint}</span>
              </button>
            );
          })}
        </nav>

        <div
          className={`app-shell__asset ${dataFreshKey ? 'app-shell__asset--fresh' : ''} ${isMobileExplore ? 'app-shell__asset--hidden' : ''}`}
        >
          <AssetSwitcher
            type={type}
            symbol={symbol}
            onTypeChange={onTypeChange}
            onSymbolChange={onSymbolChange}
            disabled={loadingMarket}
          />
          <div className="app-shell__asset-strip">
            <div className="app-shell__asset-info">
              <span className={`app-shell__asset-cat app-shell__asset-cat--${type}`}>
                {categoryMeta.label}
              </span>
              <strong>{assetName}</strong>
              <code>{symbol}</code>
            </div>
            <div className="app-shell__asset-actions">
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                onClick={onRefresh}
                disabled={loadingMarket}
                aria-label="Aggiorna dati"
              >
                ↻
              </button>
              <button
                type="button"
                className="btn btn--cta btn--compact app-shell__forecast-shortcut"
                onClick={onGoForecast}
                disabled={loadingForecast || loadingMarket}
              >
                {loadingForecast ? '…' : 'Prevedi'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <ProNavbar view={view} type={type} onNavigate={handleQuickNav} />

      {!isMobileExplore && !isTerminalExplore && view !== 'info' && (
        <Breadcrumbs
          view={view}
          type={type}
          symbol={symbol}
          assetName={assetName}
          onNavigate={handleBreadcrumb}
        />
      )}

      {view !== 'info' && !isMobileExplore && !isWorkflowView && !isTerminalExplore && (
        <div className="app-shell__categories">
          <CategorySelector
            type={type}
            onTypeChange={onTypeChange}
            summary={categorySummary}
            variant={view === 'explore' ? 'bar' : 'compact'}
            onInternalSection={onInternalSection}
          />
        </div>
      )}

      <div
        className={`app-shell__progress ${isLoading ? 'is-active' : ''}`}
        aria-hidden={!isLoading}
      />

      <main className="app-shell__main">{children}</main>

      <nav className="app-shell__bottom-nav" aria-label="Navigazione mobile">
        {(isMobile ? MOBILE_NAV_TABS : APP_VIEWS).map((v, i) => {
          const done = !isMobile && i < viewIdx;
          const active = isMobile ? mobileNavActive === v.id : view === v.id;
          const handleClick = () => {
            if (isMobile) {
              onMobileTabChange?.(v.id);
              return;
            }
            if (v.id === 'forecast') onGoForecast();
            else onViewChange(v.id);
          };
          return (
            <button
              key={v.id}
              type="button"
              className={`app-shell__bottom-tab ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
              onClick={handleClick}
              aria-current={active ? 'page' : undefined}
            >
              <span className="app-shell__bottom-icon">
                <BottomNavIcon id={v.id} active={active} />
              </span>
              <span className="app-shell__bottom-label">{v.label}</span>
            </button>
          );
        })}
      </nav>

      <MobileNavDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        view={view}
        type={type}
        onViewChange={onViewChange}
        onTypeChange={onTypeChange}
        onQuickNav={handleQuickNav}
        onOpenSearchMenu={() => {
          setMobileMenuOpen(false);
          setSearchMenuOpen(true);
        }}
        onQuickAction={onMobileSearchAction}
      />

      {isMobile && (
        <MobileSearchMenu
          open={searchMenuOpen}
          onClose={() => setSearchMenuOpen(false)}
          onSelect={onMobileSearchAction}
          onSelectAsset={onSelectAsset}
          catalog={catalog}
          fx={fx}
        />
      )}
    </div>
  );
}

export { APP_VIEWS as VIEWS };
