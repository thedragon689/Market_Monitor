const OVERLAYS = [
  { id: 'ema20', label: 'EMA 20', color: 'var(--chart-ema20)' },
  { id: 'ema50', label: 'EMA 50', color: 'var(--chart-ema50)' },
  { id: 'sma20', label: 'SMA 20', color: 'var(--chart-sma20)' },
];

export default function ChartOverlayToggles({ value = {}, onChange, disabled }) {
  const toggle = (id) => {
    onChange?.({ ...value, [id]: !value[id] });
  };

  return (
    <div className="chart-overlay-toggles" role="group" aria-label="Indicatori sul grafico">
      {OVERLAYS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`chart-overlay-toggles__btn ${value[o.id] ? 'is-active' : ''}`}
          onClick={() => toggle(o.id)}
          disabled={disabled}
          aria-pressed={Boolean(value[o.id])}
        >
          <span className="chart-overlay-toggles__dot" style={{ background: o.color }} />
          {o.label}
        </button>
      ))}
    </div>
  );
}
