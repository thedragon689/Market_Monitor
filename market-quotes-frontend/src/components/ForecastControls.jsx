const METHOD_OPTIONS = [
  { value: 'both', label: 'SMA + regressione' },
  { value: 'all', label: 'Tutti (+ log-return)' },
  { value: 'sma', label: 'Solo media mobile' },
  { value: 'linear', label: 'Solo regressione' },
  { value: 'log', label: 'Solo log-return' },
];

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
  variant = 'sticky',
}) {
  const isHero = variant === 'hero';

  return (
    <div className={`forecast-controls forecast-controls--${variant} ${busy ? 'forecast-controls--busy' : ''}`}>
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
        </label>
        <label className="forecast-controls__field forecast-controls__field--wide">
          <span>Metodo</span>
          <select
            value={forecastMethod}
            onChange={(e) => setForecastMethod(e.target.value)}
          >
            {METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
