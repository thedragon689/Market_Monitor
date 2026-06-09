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
import { chartYDomain, formatChartYTick, toDisplayPrice } from '../utils/chartAxis';
import { formatForecastDual } from '../utils/pricing';

export default function GeopoliticalImpactChart({ geo, history, fx, meta, loading }) {
  const impact = geo?.impactSeries ?? [];
  const hasImpact = impact.length > 0;

  const rawByKey = {};

  const chartData = hasImpact
    ? impact.slice(-45).map((row) => {
        rawByKey[row.date] = { actual: row.price, geoAdjusted: row.geoAdjustedPrice };
        return {
          key: row.date,
          label: formatShortDate(row.date),
          actual: toDisplayPrice(row.price, fx, meta),
          geoAdjusted: toDisplayPrice(row.geoAdjustedPrice, fx, meta),
          geoImpactPct: row.geoImpactPct,
        };
      })
    : (history ?? []).slice(-45).map((p) => {
        rawByKey[p.date] = { actual: p.price };
        return {
          key: p.date,
          label: formatShortDate(p.date),
          actual: toDisplayPrice(p.price, fx, meta),
          geoAdjusted: null,
          geoImpactPct: 0,
        };
      });

  const geoIndex = geo?.geopoliticalIndex ?? 0;

  if (loading && !chartData.length) {
    return <div className="skeleton skeleton--chart" />;
  }

  if (!chartData.length) {
    return <p className="geo-chart__empty">Servono dati storici per il grafico d’impatto.</p>;
  }

  const values = chartData.flatMap((d) =>
    [d.actual, d.geoAdjusted].filter((v) => v != null && Number.isFinite(v))
  );
  const [yMin, yMax] = chartYDomain(values, 0.1);
  const lastActual = chartData[chartData.length - 1]?.actual;

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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatChartYTick(v, fx, meta)}
            width={72}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload;
              const raw = rawByKey[row.key];

              return (
                <div className="chart-tooltip">
                  <p className="chart-tooltip__date">{row.label}</p>
                  {raw?.actual != null && (
                    <p>
                      Prezzo reale:{' '}
                      <strong>
                        {fx?.eurUsd && meta
                          ? formatForecastDual(raw.actual, fx, meta).primary
                          : raw.actual.toFixed(2)}
                      </strong>
                    </p>
                  )}
                  {raw?.geoAdjusted != null && (
                    <p>
                      Scenario geo ({geoIndex} pt):{' '}
                      <strong>{formatForecastDual(raw.geoAdjusted, fx, meta).primary}</strong>
                    </p>
                  )}
                  <p>Impatto %: {row.geoImpactPct?.toFixed(2)}%</p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lastActual != null && (
            <ReferenceLine
              y={lastActual}
              stroke="var(--border)"
              strokeDasharray="4 4"
              label={{ value: 'Ultimo', position: 'insideTopRight', fontSize: 10 }}
            />
          )}
          <Line
            type="linear"
            dataKey="actual"
            name="Prezzo reale"
            stroke="var(--chart-line)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {hasImpact && (
            <Line
              type="linear"
              dataKey="geoAdjusted"
              name="Scenario geopolitico"
              stroke="var(--chart-linear)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <p className="geo-chart__caption">
        La linea arancione mostra come l’indice geopolitico attuale ({geoIndex}, ±1% per punto)
        avrebbe spostato i prezzi storici.
      </p>
    </div>
  );
}
