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
import { chartAxisHint, chartYDomain, formatChartYTick } from '../utils/chartAxis';
import {
  buildForecastChartData,
  buildForecastRawByKey,
  forecastSeriesMeta,
} from '../utils/forecastChartData';
import { inferNativeCurrency } from '../utils/nativeCurrency';
import { formatForecastDual } from '../utils/pricing';
import ForecastDisclaimerInfo from './ForecastDisclaimerInfo';

const FORECAST_DOT = { r: 3.5, strokeWidth: 2, stroke: 'var(--bg-elevated)' };

function forecastDot(props) {
  const { cx, cy, payload } = props;
  if (payload?.kind !== 'forecast' || cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={FORECAST_DOT.r}
      fill={props.stroke}
      stroke={FORECAST_DOT.stroke}
      strokeWidth={FORECAST_DOT.strokeWidth}
    />
  );
}

function ChartTooltip({ active, payload, fx, meta, rawByKey, currency }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  const rowLine = (field, label) => {
    const raw = rawByKey?.[row.key]?.[field];
    if (row[field] == null && raw == null) return null;
    const dual =
      raw != null && fx?.eurUsd
        ? formatForecastDual(raw, fx, meta, currency)
        : { primary: row[field] != null ? String(row[field]) : '—', secondary: null };
    return (
      <p className={`chart-tooltip__row chart-tooltip__row--${field}`}>
        <span className="chart-tooltip__swatch" aria-hidden />
        <span className="chart-tooltip__row-label">{label}</span>
        <strong>{dual.primary}</strong>
        {dual.secondary && <span className="chart-tooltip__usd"> ({dual.secondary})</span>}
      </p>
    );
  };

  return (
    <div className="chart-tooltip chart-tooltip--forecast">
      <p className="chart-tooltip__date">{row.label}</p>
      {rowLine('actual', 'Reale')}
      {rowLine('sma', 'Media mobile')}
      {rowLine('linear', 'Regressione')}
      {rowLine('logReturn', 'Log-return')}
      {rowLine('prophet', 'Prophet')}
      {rowLine('arima', 'ARIMA')}
      {rowLine('lstm', 'LSTM')}
    </div>
  );
}

function ChartLegend({ payload }) {
  if (!payload?.length) return null;
  const labels = {
    actual: 'Prezzo reale',
    sma: 'Media mobile',
    linear: 'Regressione lineare',
    logReturn: 'Log-return',
    prophet: 'Prophet',
    arima: 'ARIMA',
    lstm: 'LSTM',
  };
  return (
    <ul className="chart-legend chart-legend--forecast">
      {payload.map((entry) => (
        <li key={entry.value} className={`chart-legend__item chart-legend__item--${entry.value}`}>
          <span className="chart-legend__swatch" aria-hidden />
          <span>{labels[entry.value] || entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ForecastChart({
  history,
  forecast,
  loading,
  fx,
  type,
  symbol,
  quote,
  onForecast,
  forecastLoading,
}) {
  const meta = getSymbolMeta(symbol, type);
  const currency = inferNativeCurrency(type, quote, symbol);

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

  const { data } = buildForecastChartData(history, forecast, fx, meta, currency);
  if (!data.length) return null;

  const rawByKey = buildForecastRawByKey(history, forecast);
  const series = forecastSeriesMeta(forecast);

  const values = data.flatMap((d) =>
    [d.actual, d.sma, d.linear, d.logReturn, d.prophet, d.arima, d.lstm].filter((v) => v != null)
  );
  const [yMin, yMax] = chartYDomain(values, 0.08);
  const isGram = meta.pricingKind === 'perGramTroy' || meta.pricingKind === 'perGramLb';

  const subtitleParts = [chartAxisHint(fx, meta)];
  if (series.hasSma) subtitleParts.push('verde = SMA');
  if (series.hasLinear) subtitleParts.push('arancione = regressione');
  if (series.hasLogReturn) subtitleParts.push('teal = log-return');
  if (series.hasProphet) subtitleParts.push('indaco = Prophet');
  if (series.hasArima) subtitleParts.push('viola = ARIMA');
  if (series.hasLstm) subtitleParts.push('rosa = LSTM');

  return (
    <div className="chart-card chart-card--forecast">
      <div className="chart-card__head">
        <h3 className="chart-card__title">Storico e previsioni</h3>
        <ForecastDisclaimerInfo />
      </div>
      <p className="chart-card__subtitle">{subtitleParts.join(' · ')}</p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 14, left: 2, bottom: 4 }}>
          <defs>
            <filter id="forecastLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid
            strokeDasharray="4 6"
            stroke="var(--chart-grid)"
            vertical={false}
            strokeOpacity={0.85}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={18}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatChartYTick(v, fx, meta)}
            width={isGram ? 88 : 72}
          />
          <Tooltip
            content={
              <ChartTooltip fx={fx} meta={meta} rawByKey={rawByKey} currency={currency} />
            }
          />
          <Legend content={<ChartLegend />} />

          {series.hasSma && (
            <Line
              type="linear"
              dataKey="sma"
              name="sma"
              stroke="var(--chart-sma)"
              strokeWidth={series.classicWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
              style={{ filter: 'url(#forecastLineGlow)' }}
            />
          )}

          {series.hasLinear && (
            <Line
              type="linear"
              dataKey="linear"
              name="linear"
              stroke="var(--chart-linear)"
              strokeWidth={series.classicWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
              style={{ filter: 'url(#forecastLineGlow)' }}
            />
          )}

          {series.hasLogReturn && (
            <Line
              type="monotone"
              dataKey="logReturn"
              name="logReturn"
              stroke="var(--chart-log)"
              strokeWidth={series.classicWidth}
              strokeDasharray="6 4"
              strokeLinecap="round"
              dot={forecastDot}
              connectNulls
              isAnimationActive={false}
            />
          )}

          {series.hasProphet && (
            <Line
              type="monotone"
              dataKey="prophet"
              name="prophet"
              stroke="var(--chart-prophet)"
              strokeWidth={series.overlayWidth}
              strokeDasharray="3 5"
              strokeLinecap="round"
              dot={forecastDot}
              connectNulls
              isAnimationActive={false}
            />
          )}

          {series.hasArima && (
            <Line
              type="monotone"
              dataKey="arima"
              name="arima"
              stroke="var(--chart-arima)"
              strokeWidth={series.mlWidth}
              strokeDasharray="7 4"
              strokeLinecap="round"
              dot={forecastDot}
              connectNulls
              isAnimationActive={false}
            />
          )}

          {series.hasLstm && (
            <Line
              type="monotone"
              dataKey="lstm"
              name="lstm"
              stroke="var(--chart-lstm)"
              strokeWidth={series.mlWidth}
              strokeDasharray="4 3"
              strokeLinecap="round"
              dot={forecastDot}
              connectNulls
              isAnimationActive={false}
            />
          )}

          <Line
            type="monotone"
            dataKey="actual"
            name="actual"
            stroke="var(--chart-line)"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--chart-line)', stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
