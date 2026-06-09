import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatShortDate } from '../utils/format';
import { chartAxisHint, chartYDomain, formatChartYTick, toDisplayPrice } from '../utils/chartAxis';
import { formatForecastDual } from '../utils/pricing';

function ChartTooltip({ active, payload, fx, meta, rawByDate }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const raw = rawByDate?.[point.date];
  const dual =
    raw != null && fx?.eurUsd && meta
      ? formatForecastDual(raw, fx, meta)
      : { primary: point.display?.toFixed?.(2) ?? point.display, secondary: null };

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__date">{formatShortDate(point.date)}</p>
      <p className="chart-tooltip__price">
        <strong>{dual.primary}</strong>
        {dual.secondary && <span className="chart-tooltip__usd"> ({dual.secondary})</span>}
      </p>
    </div>
  );
}

export default function HistoryChart({ history, title, loading, fx, meta }) {
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

  const rawByDate = {};
  const data = history.map((p) => {
    rawByDate[p.date] = p.price;
    return {
      ...p,
      label: formatShortDate(p.date),
      display: toDisplayPrice(p.price, fx, meta),
    };
  });

  const values = data.map((d) => d.display).filter((v) => v != null);
  const [yMin, yMax] = chartYDomain(values, 0.08);
  const isGram = meta?.pricingKind === 'perGramTroy' || meta?.pricingKind === 'perGramLb';

  return (
    <div className="chart-card">
      <h3 className="chart-card__title">{title}</h3>
      <p className="chart-card__subtitle">
        {chartAxisHint(fx, meta)} · ultimi {data.length} giorni
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
            domain={[yMin, yMax]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatChartYTick(v, fx, meta)}
            width={isGram ? 88 : 64}
          />
          <Tooltip content={<ChartTooltip fx={fx} meta={meta} rawByDate={rawByDate} />} />
          <Area
            type="linear"
            dataKey="display"
            stroke="var(--chart-line)"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--chart-line)' }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
