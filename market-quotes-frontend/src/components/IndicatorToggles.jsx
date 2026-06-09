const TOGGLES = [
  { id: 'ema', label: 'EMA / SMA' },
  { id: 'rsi', label: 'RSI' },
  { id: 'macd', label: 'MACD' },
  { id: 'bollinger', label: 'Bollinger' },
];

export default function IndicatorToggles({ value = {}, onChange, disabled }) {
  return (
    <div className="indicator-toggles" role="group" aria-label="Indicatori tecnici visibili">
      {TOGGLES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`indicator-toggles__btn ${value[t.id] !== false ? 'is-active' : ''}`}
          onClick={() => {
            const on = value[t.id] !== false;
            onChange?.({ ...value, [t.id]: !on });
          }}
          disabled={disabled}
          aria-pressed={value[t.id] !== false}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
