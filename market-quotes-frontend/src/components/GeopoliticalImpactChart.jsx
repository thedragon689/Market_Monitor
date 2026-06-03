import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatShortDate } from '../utils/format';
import { toChartDisplayValue } from '../utils/pricing';

export default function GeopoliticalImpactChart({ geo, history, fx, meta, loading }) {
  const impact = geo?.impactSeries ?? [];
  const hasImpact = impact.length > 0;

  const chartData = hasImpact
    ? impact.slice(-45).map((row) => ({
        key: row.date,
        label: formatShortDate(row.date),
        actual: fx?.eurUsd ? toChartDisplayValue(row.price, fx, meta) : row.price,
        geoAdjusted: fx?.eurUsd
          ? toChartDisplayValue(row.geoAdjustedPrice, fx, meta)
          : row.geoAdjustedPrice,
        geoImpactPct: row.geoImpactPct,
      }))
    : (history ?? []).slice(-45).map((p) => ({
        key: p.date,
        label: formatShortDate(p.date),
        actual: fx?.eurUsd ? toChartDisplayValue(p.price, fx, meta) : p.price,
        geoAdjusted: null,
        geoImpactPct: 0,
      }));

  const geoIndex = geo?.geopoliticalIndex ?? 0;

  if (loading && !chartData.length) {
    return <div className="skeleton skeleton--chart" />;
  }

  if (!chartData.length) {
    return <p className="geo-chart__empty">Servono dati storici per il grafico d’impatto.</p>;
  }

  return (
    <div className="geo-chart">
      <div className="geo-chart__stats">
        <span>
          Indice geopolitico:{' '}
          <strong className={geoIndex >= 0 ? 'geo-chart__idx--up' : 'geo-chart__idx--down'}>
            {geoIndex > 0 ? '+' : ''}
            {geoIndex}
          </strong>
        </span>
        {geo?.volatility?.annualized != null && (
          <span>Volatilità annua: {(geo.volatility.annualized * 100).toFixed(1)}%</span>
        )}
        {geo?.combinedForecast != null && (
          <span>
            Previsione combinata: <strong>{Number(geo.combinedForecast).toFixed(2)}</strong>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload;
              return (
                <div className="chart-tooltip">
                  <p className="chart-tooltip__date">{row.label}</p>
                  <p>Prezzo reale: {row.actual?.toFixed?.(2) ?? row.actual}</p>
                  {row.geoAdjusted != null && (
                    <p>Scenario geo ({geoIndex} pt): {row.geoAdjusted?.toFixed?.(2)}</p>
                  )}
                  <p>Impatto %: {row.geoImpactPct?.toFixed(2)}%</p>
                </div>
              );
            }}
          />
          <Legend />
          <ReferenceLine y={chartData[chartData.length - 1]?.actual} stroke="var(--border)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="actual"
            name="Prezzo reale"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
          />
          {hasImpact && (
            <Line
              type="monotone"
              dataKey="geoAdjusted"
              name="Scenario geopolitico"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <p className="geo-chart__caption">
        La linea tratteggiata mostra come l’indice geopolitico attuale ({geoIndex}, ±1% per punto)
        avrebbe spostato i prezzi storici. La previsione combinata integra anche volatilità.
      </p>
    </div>
  );
}
