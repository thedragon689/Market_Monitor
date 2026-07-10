import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPrice } from '../../utils/format';

const RANGES = [
  { id: '1W', label: '1S' },
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: '1Y', label: '1A' },
  { id: 'MAX', label: 'MAX' },
];

const CHART_HEIGHT = 220;

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function axisTick(value, currency) {
  const sym = currency === 'EUR' ? '€' : '$';
  return `${sym}${(value / 1000).toFixed(0)}k`;
}

export default function PortfolioHistoryChart({
  history = [],
  range = '1M',
  onRangeChange,
  loading,
  currency = 'EUR',
}) {
  const data = history.map((p) => ({
    date: fmtDate(p.date),
    value: p.totalValue,
    pl: p.totalPl,
  }));

  const showSkeleton = loading && !data.length;
  const showEmpty = !loading && !data.length;
  const showChart = data.length > 0;

  return (
    <section className="portfolio-chart app-card">
      <header className="portfolio-chart__head">
        <h3>Andamento portfolio</h3>
        <div className="portfolio-chart__ranges" role="tablist" aria-label="Periodo grafico">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={range === r.id}
              className={`portfolio-chart__range${range === r.id ? ' is-active' : ''}`}
              onClick={() => onRangeChange?.(r.id)}
              disabled={loading && range !== r.id}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="portfolio-chart__stage" style={{ minHeight: CHART_HEIGHT }}>
        {showSkeleton && (
          <div className="skeleton skeleton--portfolio-chart portfolio-chart__placeholder" aria-hidden />
        )}

        {showEmpty && (
          <p className="portfolio-list__empty portfolio-chart__empty">
            Lo storico si popola automaticamente ogni 5 minuti dal monitor portfolio.
          </p>
        )}

        {showChart && (
          <div
            className={`portfolio-chart__body${loading ? ' portfolio-chart__body--loading' : ''}`}
            style={{ height: CHART_HEIGHT }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => axisTick(v, currency)}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    formatPrice(value, currency),
                    name === 'value' ? 'Valore' : 'P/L',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#portfolioArea)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
