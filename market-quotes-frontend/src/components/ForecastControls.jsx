import { useMobileLayout } from '../hooks/useMobileLayout';
import ForecastDisclaimerInfo from './ForecastDisclaimerInfo';
import ForecastMethodPicker from './ForecastMethodPicker';

export default function ForecastControls({
  windowN,
  setWindowN,
  horizonDays,
  setHorizonDays,
  forecastMethod,
  setForecastMethod,
  onRefresh,
  onForecast,
  loadingMarket,
  loadingCatalog,
  loadingForecast,
  busy,
  symbol,
  assetName,
  historyLength = 0,
  variant = 'sticky',
}) {
  const isHero = variant === 'hero';
  const isMobile = useMobileLayout();
  const isDesktopPanel = !isMobile && variant === 'panel';

  return (
    <div
      className={`forecast-controls forecast-controls--${variant} ${isDesktopPanel ? 'forecast-controls--desktop-panel' : ''} ${busy ? 'forecast-controls--busy' : ''}`}
    >
      <div className="forecast-controls__main">
        {!isHero && (
          <div className="forecast-controls__context">
            <span className="forecast-controls__label">Asset selezionato</span>
            <strong className="forecast-controls__asset">
              {assetName}
              <code>{symbol}</code>
            </strong>
          </div>
        )}

        <div className="forecast-controls__actions">
          <ForecastDisclaimerInfo className="forecast-disclaimer-info--controls" />
          <button
            type="button"
            className="btn btn--cta"
            onClick={onForecast}
            disabled={loadingForecast || loadingMarket}
          >
            <span className="btn__icon" aria-hidden>
              ◈
            </span>
            {loadingForecast ? 'Calcolo previsione…' : 'Calcola previsione'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onRefresh}
            disabled={loadingMarket || loadingCatalog}
          >
            {loadingMarket || loadingCatalog ? 'Aggiornamento…' : 'Aggiorna quotazioni'}
          </button>
        </div>
      </div>

      <div className="forecast-controls__layout">
        <div className="forecast-controls__params">
          <label className="forecast-controls__field">
            <span>Finestra media (N)</span>
            <input
              type="number"
              min={2}
              max={60}
              value={windowN}
              onChange={(e) => setWindowN(Number(e.target.value))}
            />
            {isDesktopPanel && (
              <span className="forecast-controls__field-hint">
                Giorni usati per SMA e regressione (2–60)
              </span>
            )}
          </label>
          <label className="forecast-controls__field">
            <span>Orizzonte (giorni)</span>
            <input
              type="number"
              min={1}
              max={30}
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
            />
            {isDesktopPanel && (
              <span className="forecast-controls__field-hint">
                Quanti giorni futuri stimare (1–30)
              </span>
            )}
          </label>
        </div>

        <ForecastMethodPicker
          value={forecastMethod}
          onChange={setForecastMethod}
          historyLength={historyLength}
          layout={isMobile ? 'mobile' : 'desktop'}
        />
      </div>
    </div>
  );
}
