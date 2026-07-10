import {
  CLASSIC_METHOD_IDS,
  DESKTOP_FORECAST_TILES,
  FORECAST_METHOD_GROUPS,
  FORECAST_METHOD_META,
  ML_METHOD_IDS,
  defaultMethodForGroup,
  getMethodMeta,
  historyWarning,
  isTileActive,
  methodToGroup,
} from '../data/forecastMethods';
import { getSymbolMeta } from '../data/symbols';
import { inferNativeCurrency } from '../utils/nativeCurrency';
import {
  formatTilePreviewLabel,
  getTileMethodData,
  getTileMlPreviews,
} from '../utils/forecastMethodPreview';
import ForecastPrice from './ForecastPrice';

function historyReady(minHistory, historyLength) {
  return historyLength == null || historyLength <= 0 || historyLength >= minHistory;
}

function MethodLinePreview({ chartKey }) {
  return (
    <span
      className={`forecast-method-option__preview forecast-method-option__preview--${chartKey}`}
      aria-hidden
    />
  );
}

function HistoryBadge({ historyLength }) {
  if (!historyLength) {
    return (
      <span className="forecast-method-picker__history forecast-method-picker__history--unknown">
        Storico non caricato
      </span>
    );
  }
  const tone = historyLength >= 30 ? 'ok' : historyLength >= 18 ? 'mid' : 'low';
  return (
    <span className={`forecast-method-picker__history forecast-method-picker__history--${tone}`}>
      Storico: <strong>{historyLength}</strong> giorni
    </span>
  );
}

function TileDataRow({ preview, fx, meta, currency, tag }) {
  if (!preview) return null;
  if (preview.kind === 'error') {
    return (
      <span className="forecast-method-tile__data forecast-method-tile__data--error">
        {preview.message}
      </span>
    );
  }
  return (
    <span className="forecast-method-tile__data-row">
      <span className="forecast-method-tile__data-tag">{tag}</span>
      <ForecastPrice
        usd={preview.value}
        fx={fx}
        meta={meta}
        currency={currency}
        as="span"
      />
    </span>
  );
}

function WireframeTile({
  tile,
  value,
  onChange,
  historyLength,
  forecast,
  fx,
  meta,
  currency,
  forecastLoading,
}) {
  const active = isTileActive(tile.id, value);
  const tileMeta = FORECAST_METHOD_META[tile.methodId];
  const ready = historyReady(tileMeta.minHistory, historyLength);
  const methodData = getTileMethodData(tile.id, forecast);
  const preview = formatTilePreviewLabel(methodData);
  const mlPreviews = tile.isMlGroup ? getTileMlPreviews(forecast) : [];
  const mlRows = mlPreviews.map(({ key, label, method }) => ({
    key,
    label,
    preview: formatTilePreviewLabel(method),
  }));
  const hasMlData = mlRows.some((r) => r.preview?.kind !== 'error');
  const hasMlErrors = mlPreviews.some((r) => r.method?.error);

  return (
    <button
      type="button"
      className={`forecast-method-tile forecast-method-tile--${tile.chartKey} ${active ? 'is-active' : ''} ${ready ? '' : 'is-disabled'} ${tile.isMlGroup ? 'forecast-method-tile--ml' : ''}`}
      aria-pressed={active}
      onClick={() => onChange(tile.methodId)}
    >
      <MethodLinePreview chartKey={tile.chartKey} />
      <span className="forecast-method-tile__label">{tile.label}</span>
      <span className="forecast-method-tile__hint">{tile.hint}</span>
      {forecastLoading && (
        <span className="forecast-method-tile__data forecast-method-tile__data--loading skeleton skeleton--line" />
      )}
      {!forecastLoading && tile.isMlGroup && mlRows.length > 0 && (
        <span className="forecast-method-tile__data-group">
          {mlRows.map(({ key, label, preview: p }) =>
            p ? (
              <TileDataRow
                key={key}
                preview={p}
                tag={label}
                fx={fx}
                meta={meta}
                currency={currency}
              />
            ) : null
          )}
        </span>
      )}
      {!forecastLoading && !tile.isMlGroup && preview && (
        <span className="forecast-method-tile__data">
          <TileDataRow
            preview={preview}
            tag={preview.kind === 'level' ? 'Media' : 'Domani'}
            fx={fx}
            meta={meta}
            currency={currency}
          />
        </span>
      )}
      {!forecastLoading && tile.isMlGroup && !hasMlData && hasMlErrors && (
        <span className="forecast-method-tile__data forecast-method-tile__data--error">
          Storico insufficiente per ARIMA/LSTM
        </span>
      )}
      {!forecastLoading &&
        !preview &&
        (!tile.isMlGroup || !mlRows.length) &&
        !(tile.isMlGroup && hasMlErrors) && (
        <span className="forecast-method-tile__data forecast-method-tile__data--pending">
          {forecast ? 'Dato non disponibile' : 'Calcola per i dati'}
        </span>
      )}
    </button>
  );
}

function MlSubOptions({ value, onChange, historyLength }) {
  return (
    <div className="forecast-method-picker__ml-sub" role="group" aria-label="Varianti machine learning">
      {ML_METHOD_IDS.map((id) => {
        const m = FORECAST_METHOD_META[id];
        const active = value === id;
        const ready = historyReady(m.minHistory, historyLength);
        return (
          <button
            key={id}
            type="button"
            className={`forecast-method-picker__ml-chip ${active ? 'is-active' : ''} ${ready ? '' : 'is-disabled'}`}
            aria-pressed={active}
            onClick={() => onChange(id)}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function DesktopPicker({
  value,
  onChange,
  historyLength,
  warning,
  meta,
  forecast,
  forecastLoading,
  type,
  symbol,
  quote,
  fx,
}) {
  const mlActive = methodToGroup(value) === 'ml';
  const assetMeta = getSymbolMeta(symbol, type);
  const currency = inferNativeCurrency(type, quote, symbol);

  return (
    <div className="forecast-method-picker forecast-method-picker--desktop forecast-method-picker--wireframe">
      <div className="forecast-method-picker__wireframe-head">
        <h3 className="forecast-method-picker__wireframe-title">Storico e previsioni</h3>
        <div className="forecast-method-picker__desktop-meta">
          <HistoryBadge historyLength={historyLength} />
          <span className="forecast-method-picker__active">
            <strong>{meta.label}</strong>
          </span>
        </div>
      </div>

      <div className="forecast-method-picker__wireframe-grid" role="group" aria-label="Metodi di previsione">
        {DESKTOP_FORECAST_TILES.map((tile) => (
          <WireframeTile
            key={tile.id}
            tile={tile}
            value={value}
            onChange={onChange}
            historyLength={historyLength}
            forecast={forecast}
            fx={fx}
            meta={assetMeta}
            currency={currency}
            forecastLoading={forecastLoading}
          />
        ))}
      </div>

      {mlActive && (
        <MlSubOptions value={value} onChange={onChange} historyLength={historyLength} />
      )}

      {value === 'all' && (
        <p className="forecast-method-picker__all-inline" role="status">
          Confronto completo attivo — tutti i metodi sul grafico.
        </p>
      )}

      <div className="forecast-method-picker__wireframe-extra">
        <button
          type="button"
          className={`forecast-method-picker__all-btn ${value === 'all' ? 'is-active' : ''}`}
          onClick={() => onChange('all')}
        >
          Confronta tutti i metodi
        </button>
        {(value === 'linear' || value === 'both') && (
          <button
            type="button"
            className={`forecast-method-picker__all-btn ${value === 'both' ? 'is-active' : ''}`}
            onClick={() => onChange('both')}
          >
            SMA + regressione insieme
          </button>
        )}
      </div>

      {warning && (
        <p className="forecast-method-picker__notice" role="status">
          {warning} Prova ad aggiornare le quotazioni o scegli un metodo classico.
        </p>
      )}
    </div>
  );
}

function GroupTabs({ activeGroup, onGroupChange }) {
  return (
    <div className="forecast-method-picker__groups" role="tablist" aria-label="Tipo di previsione">
      {FORECAST_METHOD_GROUPS.map((g) => (
        <button
          key={g.id}
          type="button"
          role="tab"
          aria-selected={activeGroup === g.id}
          className={`forecast-method-picker__group ${activeGroup === g.id ? 'is-active' : ''}`}
          onClick={() => onGroupChange(g.id)}
        >
          <span className="forecast-method-picker__group-label">{g.label}</span>
          <span className="forecast-method-picker__group-hint">{g.hint}</span>
        </button>
      ))}
    </div>
  );
}

function ClassicMethods({ value, onChange }) {
  return (
    <div className="forecast-method-picker__classic" role="group" aria-label="Metodi classici">
      {CLASSIC_METHOD_IDS.map((id) => {
        const m = FORECAST_METHOD_META[id];
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            className={`forecast-method-picker__chip ${active ? 'is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(id)}
          >
            <span className="forecast-method-picker__chip-label">{m.label}</span>
            <span className="forecast-method-picker__chip-hint">{m.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

function MlEngineCard({ id, value, onChange, historyLength }) {
  const m = FORECAST_METHOD_META[id];
  const active = value === id;
  const ready = historyReady(m.minHistory, historyLength);

  return (
    <button
      type="button"
      className={`forecast-method-card forecast-method-card--${m.engine} ${active ? 'is-active' : ''} ${ready ? '' : 'is-disabled'}`}
      aria-pressed={active}
      onClick={() => onChange(id)}
    >
      <span className="forecast-method-card__tag">{m.tag}</span>
      <span className="forecast-method-card__title">{m.label}</span>
      <span className="forecast-method-card__hint">{m.hint}</span>
      <span className="forecast-method-card__detail">{m.detail}</span>
      <span className="forecast-method-card__req">
        {ready ? `✓ ${m.minHistory}+ giorni` : `Serve storico ≥ ${m.minHistory} gg`}
      </span>
    </button>
  );
}

function MlMethods({ value, onChange, historyLength }) {
  const comboActive = value === 'ml';

  return (
    <div className="forecast-method-picker__ml">
      <p className="forecast-method-picker__lead">
        Scegli un motore o confrontali insieme. I modelli ML analizzano più giorni di storico rispetto
        a SMA e regressione.
      </p>
      <div className="forecast-method-picker__ml-grid" role="group" aria-label="Motori machine learning">
        <MlEngineCard id="arima" value={value} onChange={onChange} historyLength={historyLength} />
        <MlEngineCard id="lstm" value={value} onChange={onChange} historyLength={historyLength} />
      </div>
      <button
        type="button"
        className={`forecast-method-picker__combo ${comboActive ? 'is-active' : ''}`}
        aria-pressed={comboActive}
        onClick={() => onChange('ml')}
      >
        <span className="forecast-method-picker__combo-label">ARIMA + LSTM insieme</span>
        <span className="forecast-method-picker__combo-hint">
          Due scenari sul grafico — viola e rosa
        </span>
      </button>
    </div>
  );
}

function AllMethodsInfo() {
  const m = FORECAST_METHOD_META.all;
  return (
    <div className="forecast-method-picker__all" role="status">
      <p className="forecast-method-picker__all-title">{m.label}</p>
      <p className="forecast-method-picker__all-hint">{m.hint}</p>
      <ul className="forecast-method-picker__all-list">
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--sma" />
          SMA — media mobile
        </li>
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--linear" />
          Regressione lineare
        </li>
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--log" />
          Log-return
        </li>
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--arima" />
          ARIMA — serie temporale
        </li>
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--lstm" />
          LSTM — rete neurale
        </li>
      </ul>
      <p className="forecast-method-picker__all-req">Consigliato con almeno 30 giorni di quotazioni.</p>
    </div>
  );
}

function MobilePicker({ value, onChange, historyLength, warning, meta }) {
  const activeGroup = methodToGroup(value);

  const handleGroupChange = (groupId) => {
    if (groupId === activeGroup && groupId !== 'all') return;
    onChange(defaultMethodForGroup(groupId));
  };

  return (
    <div className="forecast-method-picker forecast-method-picker--mobile">
      <div className="forecast-method-picker__head">
        <span className="forecast-method-picker__label">Come calcolare la previsione</span>
        {value && (
          <span className="forecast-method-picker__active">
            Attivo: <strong>{meta.label}</strong>
          </span>
        )}
      </div>

      <GroupTabs activeGroup={activeGroup} onGroupChange={handleGroupChange} />

      <div className="forecast-method-picker__body" role="tabpanel">
        {activeGroup === 'classic' && <ClassicMethods value={value} onChange={onChange} />}
        {activeGroup === 'ml' && (
          <MlMethods value={value} onChange={onChange} historyLength={historyLength} />
        )}
        {activeGroup === 'all' && <AllMethodsInfo />}
      </div>

      {warning && (
        <p className="forecast-method-picker__notice" role="status">
          {warning} Prova ad aggiornare le quotazioni o scegli un metodo classico.
        </p>
      )}
    </div>
  );
}

export default function ForecastMethodPicker({
  value,
  onChange,
  historyLength,
  layout = 'mobile',
  forecast = null,
  forecastLoading = false,
  type,
  symbol,
  quote,
  fx,
}) {
  const warning = historyWarning(value, historyLength);
  const meta = getMethodMeta(value);

  if (layout === 'desktop') {
    return (
      <DesktopPicker
        value={value}
        onChange={onChange}
        historyLength={historyLength}
        warning={warning}
        meta={meta}
        forecast={forecast}
        forecastLoading={forecastLoading}
        type={type}
        symbol={symbol}
        quote={quote}
        fx={fx}
      />
    );
  }

  return (
    <MobilePicker
      value={value}
      onChange={onChange}
      historyLength={historyLength}
      warning={warning}
      meta={meta}
    />
  );
}
