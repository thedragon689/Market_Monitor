import { useMobileLayout } from '../hooks/useMobileLayout';
import { getSymbolMeta } from '../data/symbols';
import { inferNativeCurrency } from '../utils/nativeCurrency';
import ForecastDisclaimerInfo from './ForecastDisclaimerInfo';
import ForecastMethodPicker from './ForecastMethodPicker';
import ForecastPrice from './ForecastPrice';

function ForecastParams({ windowN, setWindowN, horizonDays, setHorizonDays, compact = false }) {
  return (
    <div className={`forecast-controls__params ${compact ? 'forecast-controls__params--compact' : ''}`}>
      <label className="forecast-controls__field">
        <span>Finestra (N)</span>
        <input
          type="number"
          min={2}
          max={60}
          value={windowN}
          onChange={(e) => setWindowN(Number(e.target.value))}
        />
        {!compact && (
          <span className="forecast-controls__field-hint">
            Giorni usati per SMA e regressione (2–60)
          </span>
        )}
      </label>
      <label className="forecast-controls__field">
        <span>Orizzonte</span>
        <input
          type="number"
          min={1}
          max={30}
          value={horizonDays}
          onChange={(e) => setHorizonDays(Number(e.target.value))}
        />
        {!compact && (
          <span className="forecast-controls__field-hint">
            Quanti giorni futuri stimare (1–30)
          </span>
        )}
      </label>
    </div>
  );
}

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
  forecast = null,
  quote = null,
  fx = null,
  type,
  variant = 'sticky',
}) {
  const isHero = variant === 'hero';
  const isMobile = useMobileLayout();
  const isDesktopPanel = !isMobile && variant === 'panel';

  if (isDesktopPanel) {
    const assetMeta = getSymbolMeta(symbol, type);
    const currency = inferNativeCurrency(type, quote, symbol);

    return (
      <div
        className={`forecast-controls forecast-controls--panel forecast-controls--wireframe ${busy ? 'forecast-controls--busy' : ''}`}
      >
        <div className="forecast-controls__toolbar">
          <div className="forecast-controls__context">
            <span className="forecast-controls__label">Asset</span>
            <strong className="forecast-controls__asset">
              {assetName}
              <code>{symbol}</code>
            </strong>
          </div>
          {quote?.price && !quote?.error && (
            <div className="forecast-controls__spot">
              <span className="forecast-controls__label">Ultimo prezzo</span>
              <ForecastPrice
                usd={quote.price}
                fx={fx}
                meta={assetMeta}
                currency={currency}
                as="div"
              />
            </div>
          )}
          <ForecastParams
            windowN={windowN}
            setWindowN={setWindowN}
            horizonDays={horizonDays}
            setHorizonDays={setHorizonDays}
            compact
          />
          <div className="forecast-controls__actions">
            <ForecastDisclaimerInfo className="forecast-disclaimer-info--controls" />
            <button
              type="button"
              className="btn btn--cta"
              onClick={onForecast}
              disabled={loadingForecast || loadingMarket}
            >
              {loadingForecast ? 'Calcolo…' : 'Calcola previsione'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onRefresh}
              disabled={loadingMarket || loadingCatalog}
            >
              {loadingMarket || loadingCatalog ? 'Aggiorna…' : 'Aggiorna'}
            </button>
          </div>
        </div>

        <ForecastMethodPicker
          value={forecastMethod}
          onChange={setForecastMethod}
          historyLength={historyLength}
          layout="desktop"
          forecast={forecast}
          forecastLoading={loadingForecast}
          type={type}
          symbol={symbol}
          quote={quote}
          fx={fx}
        />
      </div>
    );
  }

  return (
    <div
      className={`forecast-controls forecast-controls--${variant} ${busy ? 'forecast-controls--busy' : ''}`}
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
        <ForecastParams
          windowN={windowN}
          setWindowN={setWindowN}
          horizonDays={horizonDays}
          setHorizonDays={setHorizonDays}
        />

        <ForecastMethodPicker
          value={forecastMethod}
          onChange={setForecastMethod}
          historyLength={historyLength}
          layout={isMobile ? 'mobile' : 'desktop'}
          forecast={forecast}
          forecastLoading={loadingForecast}
          type={type}
          symbol={symbol}
          quote={quote}
          fx={fx}
        />
      </div>
    </div>
  );
}
