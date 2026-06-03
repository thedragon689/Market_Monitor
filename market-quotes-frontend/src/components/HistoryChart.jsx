import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPrice, formatPriceWithEur, formatShortDate, usdToEur } from '../utils/format';

function ChartTooltip({ active, payload, fx }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__date">{formatShortDate(point.date)}</p>
      <p className="chart-tooltip__price">
        {fx?.eurUsd ? formatPriceWithEur(point.price, fx.eurUsd) : formatPrice(point.price, 'USD')}
      </p>
    </div>
  );
}

export default function HistoryChart({ history, title, loading, fx }) {
  if (loading) {
    return (
      <div className="chart-card chart-card--loading">
        <div className="skeleton skeleton--chart" />
      </div>
    );
  }

  if (!history?.length) {
    return (
      <div className="chart-card chart-card--empty">
        <h3>{title}</h3>
        <p>Non ci sono ancora dati storici da mostrare.</p>
      </div>
    );
  }

  const data = history.map((p) => ({ ...p, label: formatShortDate(p.date) }));
  const min = Math.min(...data.map((d) => d.price));
  const max = Math.max(...data.map((d) => d.price));
  const padding = (max - min) * 0.08 || max * 0.02;

  return (
    <div className="chart-card">
      <h3 className="chart-card__title">{title}</h3>
      <p className="chart-card__subtitle">
        Andamento degli ultimi {data.length} giorni — più alto = più costoso
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-fill)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--chart-fill)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[min - padding, max + padding]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              fx?.eurUsd ? `€${(usdToEur(v, fx.eurUsd) ?? 0).toFixed(0)}` : `$${v.toFixed(0)}`
            }
            width={64}
          />
          <Tooltip content={<ChartTooltip fx={fx} />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--chart-line)"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--chart-line)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
