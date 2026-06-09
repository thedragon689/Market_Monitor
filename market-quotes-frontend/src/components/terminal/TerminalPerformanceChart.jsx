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
  timeframe,
  onTimeframeChange,
}) {
  const ids = Object.keys(seriesById);

  return (
    <div className="terminal-chart">
      <div className="terminal-chart__toolbar">
        <span className="terminal-chart__label">Performance normalizzata</span>
        {timeframe && onTimeframeChange && (
          <ChartTimeframe value={timeframe} onChange={onTimeframeChange} disabled={loading} />
        )}
      </div>

      {loading && !chartData.length ? (
        <div className="terminal-chart__loading skeleton skeleton--chart" />
      ) : !chartData.length ? (
        <p className="terminal-chart__empty">
          Seleziona asset dalle tabelle (checkbox) per confrontare le performance.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300} className="terminal-chart__canvas">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--terminal-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fill: 'var(--terminal-muted)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={36}
            />
            <YAxis
              tick={{ fill: 'var(--terminal-muted)', fontSize: 12 }}
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
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
