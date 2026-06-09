import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartTimeframe from './ChartTimeframe';
import { formatShortDate } from '../utils/format';
import { chartAxisHint, chartYDomain, formatChartYTick, toDisplayPrice } from '../utils/chartAxis';
import { inferNativeCurrency } from '../utils/nativeCurrency';
import { formatForecastDual } from '../utils/pricing';

function ChartTooltip({ active, payload, fx, meta, rawByDate, currency, prevByDate }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const raw = rawByDate?.[point.date];
  const dual =
    raw != null && fx?.eurUsd && meta
      ? formatForecastDual(raw, fx, meta, currency)
      : { primary: point.display?.toFixed?.(2) ?? point.display, secondary: null };

  const prev = prevByDate?.[point.date];
  const deltaPct =
    prev != null && raw != null && prev > 0
      ? (((raw - prev) / prev) * 100).toFixed(2)
      : null;

  return (
    <div className="chart-tooltip chart-tooltip--rich">
      <p className="chart-tooltip__date">{formatShortDate(point.date)}</p>
      <p className="chart-tooltip__price">
        <strong>{dual.primary}</strong>
        {dual.secondary && <span className="chart-tooltip__usd"> ({dual.secondary})</span>}
      </p>
      {deltaPct != null && (
        <p
          className={`chart-tooltip__delta chart-tooltip__delta--${Number(deltaPct) >= 0 ? 'up' : 'down'}`}
        >
          {Number(deltaPct) >= 0 ? '+' : ''}
          {deltaPct}% vs giorno precedente
        </p>
      )}
    </div>
  );
}

export default function HistoryChart({
  history,
  title,
  loading,
  fx,
  meta,
  type,
  symbol,
  quote,
  timeframe,
  onTimeframeChange,
  showIndicators = false,
  analysis,
}) {
  const currency = inferNativeCurrency(type, quote, symbol);

  const { data, rawByDate, prevByDate } = useMemo(() => {
    if (!history?.length) {
      return { data: [], rawByDate: {}, prevByDate: {} };
    }
    const rawMap = {};
    const prevMap = {};
    const rows = history.map((p, i) => {
      rawMap[p.date] = p.price;
      if (i > 0) prevMap[p.date] = history[i - 1].price;
      return {
        ...p,
        label: formatShortDate(p.date),
        display: toDisplayPrice(p.price, fx, meta, currency),
      };
    });
    return { data: rows, rawByDate: rawMap, prevByDate: prevMap };
  }, [history, fx, meta, currency, analysis]);

  if (loading) {
    return (
      <div className="chart-card chart-card--loading">
        <div className="skeleton skeleton--chart" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="chart-card chart-card--empty">
        <h3>{title}</h3>
        <p>Non ci sono ancora dati storici da mostrare.</p>
      </div>
    );
  }

  const values = data.map((d) => d.display).filter((v) => v != null);
  const [yMin, yMax] = chartYDomain(values, 0.08);
  const isGram = meta?.pricingKind === 'perGramTroy' || meta?.pricingKind === 'perGramLb';
  const tone =
    data.length >= 2 && data[data.length - 1].display >= data[0].display ? 'up' : 'down';

  return (
    <div className="chart-card chart-card--history">
      <div className="chart-card__head">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          <p className="chart-card__subtitle">
            {chartAxisHint(fx, meta)} · {data.length} giorni
            {showIndicators && analysis?.indicators?.rsi14 != null && (
              <span className="chart-card__indicator">
                {' '}
                · RSI {Number(analysis.indicators.rsi14).toFixed(1)}
              </span>
            )}
          </p>
        </div>
        {timeframe && onTimeframeChange && (
          <ChartTimeframe
            value={timeframe}
            onChange={onTimeframeChange}
            disabled={loading}
          />
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--chart-line-${tone})`} stopOpacity={0.35} />
              <stop offset="100%" stopColor={`var(--chart-line-${tone})`} stopOpacity={0.02} />
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
          <Tooltip
            content={
              <ChartTooltip
                fx={fx}
                meta={meta}
                rawByDate={rawByDate}
                prevByDate={prevByDate}
                currency={currency}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="display"
            stroke={`var(--chart-line-${tone})`}
            strokeWidth={3}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 5, fill: `var(--chart-line-${tone})`, stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
