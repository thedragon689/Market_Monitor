import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartTimeframe from '../ChartTimeframe';
import { formatShortDate } from '../../utils/format';

function ChartTip({ active, payload, label, seriesById }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="terminal-chart-tip">
      <p className="terminal-chart-tip__date">{formatShortDate(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {seriesById[entry.dataKey]?.name ?? entry.dataKey}:{' '}
          <strong>
            {entry.value >= 0 ? '+' : ''}
            {Number(entry.value).toFixed(2)}%
          </strong>
        </p>
      ))}
    </div>
  );
}

export default function TerminalPerformanceChart({
  chartData,
  seriesById,
  loading,
  error,
  partial,
  timeframe,
  onTimeframeChange,
}) {
  const ids = Object.keys(seriesById);
  const chartKey = `${ids.join('-')}-${chartData.length}`;

  return (
    <div className="terminal-chart">
      <div className="terminal-chart__toolbar">
        <span className="terminal-chart__label">Performance normalizzata</span>
        {timeframe && onTimeframeChange && (
          <ChartTimeframe value={timeframe} onChange={onTimeframeChange} disabled={loading} />
        )}
      </div>

      {partial && chartData.length > 0 && error ? (
        <p className="terminal-chart__hint" role="status">
          {error}
        </p>
      ) : null}

      {loading && !chartData.length ? (
        <div className="terminal-chart__loading skeleton skeleton--chart" />
      ) : error && !chartData.length ? (
        <p className="terminal-chart__empty terminal-chart__empty--error" role="alert">
          {error}
        </p>
      ) : !chartData.length ? (
        <p className="terminal-chart__empty">
          {ids.length
            ? 'Caricamento performance in corso o dati non disponibili — seleziona altri asset o riprova.'
            : 'Seleziona asset dalle tabelle (checkbox) per confrontare le performance.'}
        </p>
      ) : (
        <div className="terminal-chart__stage">
          <ResponsiveContainer
            key={chartKey}
            width="100%"
            height={300}
            minWidth={280}
            minHeight={300}
            initialDimension={{ width: 640, height: 300 }}
            className="terminal-chart__canvas"
          >
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(148,163,184,0.25)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                minTickGap={36}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}%`}
                width={48}
              />
              <Tooltip content={<ChartTip seriesById={seriesById} />} />
              <Legend
                wrapperStyle={{ fontSize: '0.72rem' }}
                formatter={(value) => seriesById[value]?.name ?? value}
              />
              {ids.map((id) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={id}
                  stroke={seriesById[id].color}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
