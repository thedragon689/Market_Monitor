import CategorySelector from './CategorySelector';
import { getCategoryMeta } from '../data/categories';

const VIEWS = [
  { id: 'explore', step: '1', label: 'Scegli', hint: 'Categoria e titolo' },
  { id: 'analysis', step: '2', label: 'Analizza', hint: 'Prezzo e segnali' },
  { id: 'forecast', step: '3', label: 'Prevedi', hint: 'Scenari futuri' },
];

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
  children,
}) {
  const categoryMeta = getCategoryMeta(type);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <img
            className="app-shell__logo"
            src="/market.png"
            alt="Market Monitor"
            width={44}
            height={44}
          />
          <div>
            <strong className="app-shell__title">Market Monitor</strong>
            <span className="app-shell__tagline">Quotazioni · Analisi · Previsioni</span>
          </div>
        </div>

        <nav className="app-shell__nav app-shell__nav--steps" aria-label="Passaggi principali">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`app-shell__tab ${view === v.id ? 'is-active' : ''}`}
              onClick={() => onViewChange(v.id)}
              aria-current={view === v.id ? 'page' : undefined}
            >
              <span className="app-shell__tab-step">{v.step}</span>
              <span className="app-shell__tab-label">{v.label}</span>
              <span className="app-shell__tab-hint">{v.hint}</span>
            </button>
          ))}
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
            >
              ↻
            </button>
            <button
              type="button"
              className="btn btn--cta btn--compact"
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
    </div>
  );
}

export { VIEWS };
