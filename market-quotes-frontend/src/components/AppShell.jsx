import CategorySelector from './CategorySelector';
import AppLogo from './AppLogo';
import BottomNavIcon from './BottomNavIcon';
import { getCategoryMeta } from '../data/categories';
import { APP_VIEWS, getViewIndex } from '../data/views';

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
  children,
}) {
  const categoryMeta = getCategoryMeta(type);
  const viewIdx = getViewIndex(view);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <span className="app-shell__logo-wrap">
            <AppLogo className="app-shell__logo" size={48} />
          </span>
          <div>
            <strong className="app-shell__title">Market Monitor</strong>
            <span className="app-shell__tagline">Quotazioni · Analisi · Previsioni</span>
          </div>
          {themeToggle}
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
                onClick={() => onViewChange(v.id)}
                aria-current={view === v.id ? 'page' : undefined}
              >
                <span className="app-shell__tab-step">{v.step}</span>
                <span className="app-shell__tab-label">{v.label}</span>
                <span className="app-shell__tab-hint">{v.hint}</span>
              </button>
            );
          })}
        </nav>

        <div className="app-shell__asset">
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
      </header>

      <div className="app-shell__categories">
        <CategorySelector
          type={type}
          onTypeChange={onTypeChange}
          summary={categorySummary}
          variant={view === 'explore' ? 'bar' : 'compact'}
        />
      </div>

      {isLoading && <div className="app-shell__progress" aria-hidden />}

      <main className="app-shell__main">{children}</main>

      <nav className="app-shell__bottom-nav" aria-label="Navigazione mobile">
        {APP_VIEWS.map((v, i) => {
          const done = i < viewIdx;
          return (
            <button
              key={v.id}
              type="button"
              className={`app-shell__bottom-tab ${view === v.id ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
              onClick={() => onViewChange(v.id)}
              aria-current={view === v.id ? 'page' : undefined}
            >
              <span className="app-shell__bottom-icon">
                <BottomNavIcon id={v.id} active={view === v.id} />
              </span>
              <span className="app-shell__bottom-label">{v.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export { APP_VIEWS as VIEWS };
