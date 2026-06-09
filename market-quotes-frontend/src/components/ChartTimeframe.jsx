import { CHART_TIMEFRAMES } from '../data/chartTimeframes';

export default function ChartTimeframe({ value, onChange, disabled }) {
  return (
    <div className="chart-timeframe" role="group" aria-label="Intervallo storico">
      {CHART_TIMEFRAMES.map((tf) => (
        <button
          key={tf.id}
          type="button"
          className={`chart-timeframe__btn ${value === tf.id ? 'is-active' : ''}`}
          onClick={() => onChange?.(tf.id)}
          disabled={disabled}
          aria-pressed={value === tf.id}
          title={`Ultimi ${tf.days} giorni`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
