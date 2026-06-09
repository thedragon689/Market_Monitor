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
import { getSymbolMeta } from '../data/symbols';
import { formatShortDate } from '../utils/format';
import { chartAxisHint, chartYDomain, formatChartYTick, toDisplayPrice } from '../utils/chartAxis';
import { formatForecastDual } from '../utils/pricing';

function applyForecastOverlays(trimmed, forecast, cv) {
  if (!trimmed.length || !forecast?.methods) return;

  const reg = forecast.methods.linearRegression;
  const smaLevel = forecast.methods.sma?.level;
  const window =
    reg?.window ?? forecast.methods.sma?.window ?? forecast.windowSize ?? 5;

  if (reg?.coefficients && !reg.error) {
    const { slope, intercept } = reg.coefficients;
    const w = Math.min(window, trimmed.length);
    const start = trimmed.length - w;
    for (let i = 0; i < w; i++) {
      const dayT = window - w + i + 1;
      trimmed[start + i].linear = cv(slope * dayT + intercept);
    }
  }

  if (smaLevel != null) {
    const w = Math.min(window, trimmed.length);
    const start = trimmed.length - w;
    const smaVal = cv(smaLevel);
    for (let i = start; i < trimmed.length; i++) {
      trimmed[i].sma = smaVal;
    }
  }
}

function buildChartData(history, forecast, fx, meta) {
  if (!history?.length) return [];

  const cv = (p) => toDisplayPrice(p, fx, meta);

  const historical = history.map((p, i) => ({
    key: `h-${p.date}`,
    date: p.date,
    label: formatShortDate(p.date),
    actual: cv(p.price),
    sma: null,
    linear: null,
    kind: 'history',
    index: i + 1,
  }));

  const last = historical[historical.length - 1];
  const n = historical.length;

  const smaPoints = forecast?.methods?.sma?.forecasts ?? [];
  const linearPoints = forecast?.methods?.linearRegression?.forecasts ?? [];
  const maxLen = Math.max(smaPoints.length, linearPoints.length);

  const future = [];
  for (let k = 0; k < maxLen; k++) {
    const offset = k + 1;
    future.push({
      key: `f-${offset}`,
      date: null,
      label: `+${offset} gg`,
      actual: k === 0 ? last.actual : null,
      sma: cv(smaPoints[k]?.price ?? null),
      linear: cv(linearPoints[k]?.price ?? null),
      kind: 'forecast',
      index: n + offset,
    });
  }

  if (future.length) {
    future[0].actual = last.actual;
  }

  const trimmed = historical.slice(-45);
  applyForecastOverlays(trimmed, forecast, cv);

  return [...trimmed, ...future];
}

function ChartTooltip({ active, payload, fx, meta, rawByKey }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  const rowLine = (field, label) => {
    const raw = rawByKey?.[row.key]?.[field];
    if (row[field] == null && raw == null) return null;
    const dual =
      raw != null && fx?.eurUsd
        ? formatForecastDual(raw, fx, meta)
        : { primary: row[field] != null ? String(row[field]) : '—', secondary: null };
    return (
      <p className={`chart-tooltip__row chart-tooltip__row--${field}`}>
        <span>{label}</span>{' '}
        <strong>{dual.primary}</strong>
        {dual.secondary && <span className="chart-tooltip__usd"> ({dual.secondary})</span>}
      </p>
    );
  };

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__date">{row.label}</p>
      {rowLine('actual', 'Reale')}
      {rowLine('sma', 'Media mobile')}
      {rowLine('linear', 'Regressione lineare')}
    </div>
  );
}

export default function ForecastChart({
  history,
  forecast,
  loading,
  fx,
  type,
  symbol,
  onForecast,
  forecastLoading,
}) {
  const meta = getSymbolMeta(symbol, type);

  if (loading) {
    return (
      <div className="chart-card chart-card--loading">
        <div className="skeleton skeleton--chart" />
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="chart-card chart-card--empty chart-card--cta">
        <div className="chart-card__empty-icon" aria-hidden>
          ◈
        </div>
        <h3>Nessuna previsione ancora</h3>
        <p>
          Scegli un asset dal catalogo e premi <strong>Prevedi</strong>, oppure calcola qui sotto
          con i parametri impostati.
        </p>
        <button
          type="button"
          className="btn btn--cta btn--large"
          onClick={onForecast}
          disabled={forecastLoading}
        >
          {forecastLoading ? 'Calcolo previsione…' : 'Calcola previsione adesso'}
        </button>
      </div>
    );
  }

  const trimmedHist = history?.slice(-45) ?? [];
  const rawByKey = {};
  trimmedHist.forEach((p) => {
    rawByKey[`h-${p.date}`] = { actual: p.price };
  });

  const reg = forecast?.methods?.linearRegression;
  const smaLevel = forecast?.methods?.sma?.level;
  const window = reg?.window ?? forecast?.methods?.sma?.window ?? forecast.windowSize ?? 5;

  if (trimmedHist.length && reg?.coefficients) {
    const anchorKey = `h-${trimmedHist[trimmedHist.length - 1].date}`;
    const { slope, intercept } = reg.coefficients;
    rawByKey[anchorKey] = {
      ...rawByKey[anchorKey],
      linear: slope * window + intercept,
    };
    const w = Math.min(window, trimmedHist.length);
    const start = trimmedHist.length - w;
    for (let i = 0; i < w; i++) {
      const dayT = window - w + i + 1;
      const key = `h-${trimmedHist[start + i].date}`;
      rawByKey[key] = { ...rawByKey[key], linear: slope * dayT + intercept };
    }
  }

  if (smaLevel != null && trimmedHist.length) {
    const w = Math.min(window, trimmedHist.length);
    for (let i = trimmedHist.length - w; i < trimmedHist.length; i++) {
      const key = `h-${trimmedHist[i].date}`;
      rawByKey[key] = { ...rawByKey[key], sma: smaLevel };
    }
  }

  const smaPts = forecast?.methods?.sma?.forecasts ?? [];
  const linPts = forecast?.methods?.linearRegression?.forecasts ?? [];
  const maxLen = Math.max(smaPts.length, linPts.length);
  const lastHist = history[history.length - 1];
  for (let k = 0; k < maxLen; k++) {
    rawByKey[`f-${k + 1}`] = {
      actual: k === 0 ? lastHist?.price : null,
      sma: smaPts[k]?.price ?? null,
      linear: linPts[k]?.price ?? null,
    };
  }

  const data = buildChartData(history, forecast, fx, meta);
  if (!data.length) return null;

  const values = data.flatMap((d) => [d.actual, d.sma, d.linear].filter((v) => v != null));
  const [yMin, yMax] = chartYDomain(values, 0.1);
  const isGram = meta.pricingKind === 'perGramTroy' || meta.pricingKind === 'perGramLb';

  return (
    <div className="chart-card">
      <h3 className="chart-card__title">Storico e previsioni</h3>
      <p className="chart-card__subtitle">
        {chartAxisHint(fx, meta)} · storico (indigo) · verde = media mobile · arancione = regressione
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
            width={isGram ? 88 : 72}
          />
          <Tooltip content={<ChartTooltip fx={fx} meta={meta} rawByKey={rawByKey} />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => {
              const labels = {
                actual: 'Prezzo reale',
                sma: 'Media mobile',
                linear: 'Regressione lineare',
              };
              return labels[value] || value;
            }}
          />
          <Line
            type="linear"
            dataKey="actual"
            name="actual"
            stroke="var(--chart-line)"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="sma"
            name="sma"
            stroke="var(--chart-sma)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="linear"
            name="linear"
            stroke="var(--chart-linear)"
            strokeWidth={2}
            strokeDasharray="2 4"
            dot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
