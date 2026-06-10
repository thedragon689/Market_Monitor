import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartTimeframe from './ChartTimeframe';
import ChartOverlayToggles from './ChartOverlayToggles';
import { formatShortDate } from '../utils/format';
import { chartAxisHint, chartYDomain, formatChartYTick, toDisplayPrice } from '../utils/chartAxis';
import { enrichChartWithOverlays } from '../utils/chartIndicators';
import { appendForecastOverlays } from '../utils/historyForecastOverlay';
import { inferNativeCurrency } from '../utils/nativeCurrency';
import { formatForecastDual } from '../utils/pricing';
import { useMobileLayout } from '../hooks/useMobileLayout';

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

  const overlayLine = (key, label) =>
    point[key] != null ? (
      <p className="chart-tooltip__overlay" key={key}>
        {label}: {Number(point[key]).toFixed(2)}
      </p>
    ) : null;

  return (
    <div className="chart-tooltip chart-tooltip--rich">
      <p className="chart-tooltip__date">
        {point.kind === 'forecast' ? point.label : formatShortDate(point.date)}
      </p>
      {point.display != null && (
        <p className="chart-tooltip__price">
          <strong>{dual.primary}</strong>
          {dual.secondary && <span className="chart-tooltip__usd"> ({dual.secondary})</span>}
        </p>
      )}
      {deltaPct != null && (
        <p
          className={`chart-tooltip__delta chart-tooltip__delta--${Number(deltaPct) >= 0 ? 'up' : 'down'}`}
        >
          {Number(deltaPct) >= 0 ? '+' : ''}
          {deltaPct}% vs giorno precedente
        </p>
      )}
      {overlayLine('ema20', 'EMA 20')}
      {overlayLine('ema50', 'EMA 50')}
      {overlayLine('ema200', 'EMA 200')}
      {overlayLine('sma20', 'SMA 20')}
      {overlayLine('bbUpper', 'BB sup.')}
      {overlayLine('bbMiddle', 'BB media')}
      {overlayLine('bbLower', 'BB inf.')}
      {overlayLine('fcArima', 'ARIMA')}
      {overlayLine('fcLstm', 'LSTM')}
      {overlayLine('fcHybrid', 'Ibrido')}
    </div>
  );
}

const DEFAULT_OVERLAYS = {
  ema20: true,
  ema50: false,
  ema200: false,
  sma20: false,
  bollinger: false,
  forecastArima: false,
  forecastLstm: false,
  forecastHybrid: false,
};

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
  chartOverlays,
  onChartOverlaysChange,
  forecast,
  onRequestForecast,
  forecastLoading,
  refreshing = false,
}) {
  const isMobile = useMobileLayout();
  const [fullscreen, setFullscreen] = useState(false);
  const overlays = { ...DEFAULT_OVERLAYS, ...chartOverlays };
  const currency = inferNativeCurrency(type, quote, symbol);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const prev = document.body.style.overflow;
    document.body.classList.add('chart-fullscreen-open');
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('chart-fullscreen-open');
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const { data, rawByDate, prevByDate, histCount } = useMemo(() => {
    if (!history?.length) {
      return { data: [], rawByDate: {}, prevByDate: {}, histCount: 0 };
    }
    const rawMap = {};
    const prevMap = {};
    const rows = history.map((p, i) => {
      rawMap[p.date] = p.price;
      if (i > 0) prevMap[p.date] = history[i - 1].price;
      return {
        ...p,
        key: `h-${p.date}`,
        label: formatShortDate(p.date),
        display: toDisplayPrice(p.price, fx, meta, currency),
        kind: 'history',
      };
    });
    let enriched = enrichChartWithOverlays(rows, overlays, fx, meta, currency);
    enriched = appendForecastOverlays(enriched, forecast, overlays, fx, meta, currency);
    return { data: enriched, rawByDate: rawMap, prevByDate: prevMap, histCount: rows.length };
  }, [history, fx, meta, currency, overlays, forecast]);

  if (loading && !data.length) {
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

  const valueKeys = ['display', 'ema20', 'ema50', 'ema200', 'sma20', 'bbUpper', 'bbLower', 'fcArima', 'fcLstm', 'fcHybrid'];
  const values = data.flatMap((d) => valueKeys.map((k) => d[k]).filter((v) => v != null));
  const [yMin, yMax] = chartYDomain(values, 0.08);
  const isGram = meta?.pricingKind === 'perGramTroy' || meta?.pricingKind === 'perGramLb';
  const histRows = data.filter((d) => d.kind !== 'forecast');
  const tone =
    histRows.length >= 2 &&
    histRows[histRows.length - 1].display >= histRows[0].display
      ? 'up'
      : 'down';
  const chartHeight = fullscreen ? 480 : isMobile ? 340 : 320;
  const brushEnd = histCount > 0 ? Math.min(histCount - 1, data.length - 1) : data.length - 1;

  return (
    <div
      className={`chart-card chart-card--history ${fullscreen ? 'chart-card--fullscreen' : ''} ${refreshing ? 'chart-card--refreshing' : ''}`}
    >
      <div className="chart-card__head">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          <p className="chart-card__subtitle">
            {chartAxisHint(fx, meta)} · {histCount} giorni
            {showIndicators && analysis?.indicators?.rsi14 != null && (
              <span className="chart-card__indicator">
                {' '}
                · RSI {Number(analysis.indicators.rsi14).toFixed(1)}
              </span>
            )}
          </p>
        </div>
        <div className="chart-card__controls">
          {isMobile && (
            <button
              type="button"
              className="chart-card__fullscreen-btn"
              onClick={() => setFullscreen((v) => !v)}
              aria-label={fullscreen ? 'Esci da schermo intero' : 'Grafico a schermo intero'}
            >
              {fullscreen ? '✕' : '⛶'}
            </button>
          )}
          {onChartOverlaysChange && (
            <ChartOverlayToggles
              value={overlays}
              onChange={onChartOverlaysChange}
              disabled={loading}
              forecastReady={Boolean(forecast)}
              onRequestForecast={onRequestForecast}
            />
          )}
          {timeframe && onTimeframeChange && (
            <ChartTimeframe
              value={timeframe}
              onChange={onTimeframeChange}
              disabled={loading}
            />
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--chart-line-${tone})`} stopOpacity={0.38} />
              <stop offset="100%" stopColor={`var(--chart-line-${tone})`} stopOpacity={0.03} />
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
          {overlays.bollinger && (
            <>
              <Line
                type="monotone"
                dataKey="bbUpper"
                stroke="var(--chart-bb, #94a3b8)"
                strokeWidth={1.25}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="bbLower"
                stroke="var(--chart-bb, #94a3b8)"
                strokeWidth={1.25}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="bbMiddle"
                stroke="var(--chart-bb-mid, #64748b)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="display"
            stroke={`var(--chart-line-${tone})`}
            strokeWidth={4}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{
              r: 6,
              fill: `var(--chart-line-${tone})`,
              stroke: 'var(--bg-elevated)',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
            connectNulls={false}
          />
          {overlays.ema20 && (
            <Line type="monotone" dataKey="ema20" stroke="var(--chart-ema20)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlays.ema50 && (
            <Line type="monotone" dataKey="ema50" stroke="var(--chart-ema50)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlays.ema200 && (
            <Line type="monotone" dataKey="ema200" stroke="var(--chart-ema200, #a78bfa)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlays.sma20 && (
            <Line type="monotone" dataKey="sma20" stroke="var(--chart-sma20)" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlays.forecastArima && (
            <Line type="monotone" dataKey="fcArima" stroke="var(--chart-arima, #f59e0b)" strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlays.forecastLstm && (
            <Line type="monotone" dataKey="fcLstm" stroke="var(--chart-lstm, #8b5cf6)" strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlays.forecastHybrid && (
            <Line type="monotone" dataKey="fcHybrid" stroke="var(--chart-hybrid, #06b6d4)" strokeWidth={2.75} strokeDasharray="2 2" dot={false} isAnimationActive={false} connectNulls />
          )}
          {histCount > 14 && (
            <Brush
              dataKey="label"
              height={30}
              stroke="var(--accent)"
              fill="var(--surface)"
              travellerWidth={12}
              startIndex={Math.max(0, brushEnd - 14)}
              endIndex={brushEnd}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {forecastLoading && (overlays.forecastArima || overlays.forecastLstm || overlays.forecastHybrid) && (
        <p className="chart-card__forecast-hint">Calcolo previsioni per overlay…</p>
      )}
      <p className="chart-card__zoom-hint">
        {isMobile ? 'Pinch o trascina la barra per zoom' : 'Trascina la barra sotto il grafico per zoom e pan'}
      </p>
    </div>
  );
}
