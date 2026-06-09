const INDICATOR_OVERLAYS = [
  { id: 'ema20', label: 'EMA 20', color: 'var(--chart-ema20)', group: 'indicators' },
  { id: 'ema50', label: 'EMA 50', color: 'var(--chart-ema50)', group: 'indicators' },
  { id: 'ema200', label: 'EMA 200', color: 'var(--chart-ema200, #a78bfa)', group: 'indicators' },
  { id: 'sma20', label: 'SMA 20', color: 'var(--chart-sma20)', group: 'indicators' },
  { id: 'bollinger', label: 'Bollinger', color: 'var(--chart-bb, #94a3b8)', group: 'indicators' },
];

const FORECAST_OVERLAYS = [
  { id: 'forecastArima', label: 'ARIMA', color: 'var(--chart-arima, #f59e0b)', group: 'forecast' },
  { id: 'forecastLstm', label: 'LSTM', color: 'var(--chart-lstm, #8b5cf6)', group: 'forecast' },
  { id: 'forecastHybrid', label: 'Ibrido', color: 'var(--chart-hybrid, #06b6d4)', group: 'forecast' },
];

function ToggleGroup({ label, items, value, onChange, disabled, forecastReady, onRequestForecast }) {
  const toggle = (id, isForecast) => {
    const next = !value[id];
    if (isForecast && next && !forecastReady) {
      onRequestForecast?.();
    }
    onChange?.({ ...value, [id]: next });
  };

  return (
    <div className="chart-overlay-toggles__group">
      <span className="chart-overlay-toggles__group-label">{label}</span>
      <div className="chart-overlay-toggles__chips">
        {items.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`chart-overlay-toggles__btn ${value[o.id] ? 'is-active' : ''}`}
            onClick={() => toggle(o.id, o.group === 'forecast')}
            disabled={disabled}
            aria-pressed={Boolean(value[o.id])}
          >
            <span className="chart-overlay-toggles__dot" style={{ background: o.color }} />
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChartOverlayToggles({
  value = {},
  onChange,
  disabled,
  forecastReady,
  onRequestForecast,
}) {
  return (
    <div className="chart-overlay-toggles" role="group" aria-label="Overlay grafico">
      <ToggleGroup
        label="Indicatori"
        items={INDICATOR_OVERLAYS}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      <ToggleGroup
        label="Previsioni"
        items={FORECAST_OVERLAYS}
        value={value}
        onChange={onChange}
        disabled={disabled}
        forecastReady={forecastReady}
        onRequestForecast={onRequestForecast}
      />
    </div>
  );
}
