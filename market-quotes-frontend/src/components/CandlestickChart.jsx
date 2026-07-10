import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
} from 'lightweight-charts';
import { useTheme } from '../theme/ThemeProvider';
import { API_BASE } from '../config/api';
import { apiFetch } from '../utils/apiFetch';
import {
  bollingerSeries,
  fibonacciLevels,
  macdSeries,
  normalizeCompareSeries,
  rsiSeries,
  toHistPoints,
  toLinePoints,
} from '../utils/chartIndicators';
import { ChartWidgetSkeleton } from './ui/DataWidgetSkeleton';
import './candlestick.css';

const TIMEFRAMES = [
  { id: '1m', label: '1m', interval: '1m', range: '1d', intraday: true },
  { id: '5m', label: '5m', interval: '5m', range: '5d', intraday: true },
  { id: '15m', label: '15m', interval: '15m', range: '1mo', intraday: true },
  { id: '1h', label: '1h', interval: '1h', range: '3mo', intraday: true },
  { id: '1M', label: '1M', interval: '1d', range: '1mo' },
  { id: '6M', label: '6M', interval: '1d', range: '6mo' },
  { id: '1A', label: '1A', interval: '1d', range: '1y' },
  { id: '5A', label: '5A', interval: '1d', range: '5y' },
];

const OVERLAY_DEFS = [
  { id: 'sma20', label: 'SMA 20', kind: 'sma', period: 20, color: '#58a6ff' },
  { id: 'sma50', label: 'SMA 50', kind: 'sma', period: 50, color: '#d29922' },
  { id: 'sma200', label: 'SMA 200', kind: 'sma', period: 200, color: '#8b949e' },
  { id: 'ema12', label: 'EMA 12', kind: 'ema', period: 12, color: '#a371f7' },
  { id: 'ema26', label: 'EMA 26', kind: 'ema', period: 26, color: '#f778ba' },
];

const PANEL_DEFS = [
  { id: 'bb', label: 'Bollinger' },
  { id: 'rsi', label: 'RSI' },
  { id: 'macd', label: 'MACD' },
];

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function smaSeries(values, period) {
  const res = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) res[i] = sum / period;
  }
  return res;
}

function emaSeries(values, period) {
  const res = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev;
  for (let i = 0; i < values.length; i += 1) {
    if (i < period - 1) continue;
    if (i === period - 1) {
      let s = 0;
      for (let j = 0; j < period; j += 1) s += values[j];
      prev = s / period;
      res[i] = prev;
    } else {
      prev = values[i] * k + prev * (1 - k);
      res[i] = prev;
    }
  }
  return res;
}

function overlayData(candles, def) {
  const closes = candles.map((c) => c.close);
  const line = def.kind === 'sma' ? smaSeries(closes, def.period) : emaSeries(closes, def.period);
  return toLinePoints(candles, line);
}

function buildChartOptions(compact = false) {
  const text = cssVar('--text-muted', '#8b949e');
  const border = cssVar('--border', '#30363d');
  const grid = `color-mix(in srgb, ${border} 55%, transparent)`;
  return {
    layout: {
      background: { color: 'transparent' },
      textColor: text,
      fontFamily: 'Inter, system-ui, sans-serif',
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: grid },
      horzLines: { color: grid },
    },
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: { borderColor: border },
    timeScale: {
      borderColor: border,
      timeVisible: !compact,
      secondsVisible: false,
      rightOffset: 4,
    },
    autoSize: true,
  };
}

function formatTipNum(n, digits = 4) {
  if (n == null || !Number.isFinite(n)) return '—';
  return Number(n).toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function exportCsv(candles, symbol) {
  const header = 'date,open,high,low,close,volume\n';
  const rows = candles
    .map((c) =>
      [c.time ?? c.date, c.open, c.high, c.low, c.close, c.volume ?? 0].join(',')
    )
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${symbol}-ohlc.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSvg(wrapEl, symbol) {
  if (!wrapEl) return;
  const canvases = wrapEl.querySelectorAll('canvas');
  if (!canvases.length) return;
  const w = canvases[0].width;
  let h = 0;
  canvases.forEach((c) => {
    h += c.height;
  });
  let y = 0;
  const parts = [];
  canvases.forEach((c) => {
    parts.push(
      `<image href="${c.toDataURL('image/png')}" x="0" y="${y}" width="${w}" height="${c.height}" />`
    );
    y += c.height;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${parts.join('')}</svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${symbol}-chart.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPng(wrapEl, symbol) {
  if (!wrapEl) return;
  const canvases = wrapEl.querySelectorAll('canvas');
  if (!canvases.length) return;
  const w = canvases[0].width;
  let h = 0;
  canvases.forEach((c) => {
    h += c.height;
  });
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  let y = 0;
  canvases.forEach((c) => {
    ctx.drawImage(c, 0, y);
    y += c.height;
  });
  const a = document.createElement('a');
  a.href = out.toDataURL('image/png');
  a.download = `${symbol}-chart.png`;
  a.click();
}

/**
 * Grafico candlestick avanzato: volumi, overlay, Bollinger, pannelli RSI/MACD,
 * crosshair tooltip, export PNG/CSV, trendline base.
 */
export default function CandlestickChart({
  symbol,
  type,
  height = 420,
  defaultTf = '6M',
  compareSymbol = null,
}) {
  const { isDark } = useTheme();
  const stackRef = useRef(null);
  const mainRef = useRef(null);
  const rsiRef = useRef(null);
  const macdRef = useRef(null);
  const mainChartRef = useRef(null);
  const rsiChartRef = useRef(null);
  const macdChartRef = useRef(null);
  const candleRef = useRef(null);
  const volumeRef = useRef(null);
  const overlayRefs = useRef({});
  const bbRefs = useRef({});
  const rsiLineRef = useRef(null);
  const macdLineRef = useRef(null);
  const macdSignalRef = useRef(null);
  const macdHistRef = useRef(null);
  const trendlineRefs = useRef([]);
  const fibRefs = useRef([]);
  const compareRef = useRef(null);
  const hlineRefs = useRef([]);
  const syncingRef = useRef(false);

  const [tfId, setTfId] = useState(defaultTf);
  const tf = TIMEFRAMES.find((t) => t.id === tfId) || TIMEFRAMES[5];
  const [activeOverlays, setActiveOverlays] = useState(() => new Set(['sma20', 'ema12']));
  const [activePanels, setActivePanels] = useState(() => new Set(['rsi', 'macd']));
  const [showFib, setShowFib] = useState(false);
  const [drawTrend, setDrawTrend] = useState(false);
  const [drawHLine, setDrawHLine] = useState(false);
  const [trendPoints, setTrendPoints] = useState([]);
  const [compareInput, setCompareInput] = useState(compareSymbol || '');
  const [compareCandles, setCompareCandles] = useState([]);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tip, setTip] = useState(null);

  const showRsi = activePanels.has('rsi');
  const showMacd = activePanels.has('macd');
  const showBb = activePanels.has('bb');
  const panelCount = (showRsi ? 1 : 0) + (showMacd ? 1 : 0);
  const mainHeight = Math.max(220, height - panelCount * 96);

  const indicatorData = useMemo(() => {
    if (!candles.length) return null;
    return {
      rsi: rsiSeries(candles),
      macd: macdSeries(candles),
      bb: bollingerSeries(candles),
    };
  }, [candles]);

  const toggleOverlay = useCallback((id) => {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePanel = useCallback((id) => {
    setActivePanels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const syncRange = useCallback((source, targets) => {
    const chart = source;
    if (!chart) return undefined;
    const handler = (range) => {
      if (!range || syncingRef.current) return;
      syncingRef.current = true;
      targets.forEach((t) => {
        try {
          t?.timeScale().setVisibleLogicalRange(range);
        } catch {
          /* ignore */
        }
      });
      syncingRef.current = false;
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
  }, []);

  // Grafico principale
  useEffect(() => {
    const container = mainRef.current;
    if (!container) return undefined;

    const chart = createChart(container, buildChartOptions());
    mainChartRef.current = chart;

    const up = cssVar('--up', '#3fb950');
    const down = cssVar('--down', '#f85149');
    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    });
    volumeRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const onDbl = () => chart.timeScale().fitContent();
    container.addEventListener('dblclick', onDbl);

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setTip(null);
        return;
      }
      const cd = param.seriesData.get(candleRef.current);
      const vd = param.seriesData.get(volumeRef.current);
      if (!cd) {
        setTip(null);
        return;
      }
      setTip({
        time: param.time,
        open: cd.open,
        high: cd.high,
        low: cd.low,
        close: cd.close,
        volume: vd?.value,
      });
    });

    return () => {
      container.removeEventListener('dblclick', onDbl);
      chart.remove();
      mainChartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      overlayRefs.current = {};
      bbRefs.current = {};
      trendlineRefs.current = [];
    };
  }, []);

  // Pannello RSI
  useEffect(() => {
    if (!showRsi) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiLineRef.current = null;
      }
      return undefined;
    }
    const container = rsiRef.current;
    if (!container) return undefined;
    const chart = createChart(container, buildChartOptions(true));
    rsiChartRef.current = chart;
    rsiLineRef.current = chart.addSeries(LineSeries, {
      color: '#58a6ff',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
  }, [showRsi]);

  // Pannello MACD
  useEffect(() => {
    if (!showMacd) {
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdLineRef.current = null;
        macdSignalRef.current = null;
        macdHistRef.current = null;
      }
      return undefined;
    }
    const container = macdRef.current;
    if (!container) return undefined;
    const chart = createChart(container, buildChartOptions(true));
    macdChartRef.current = chart;
    macdHistRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'macd-hist',
    });
    chart.priceScale('macd-hist').applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
    macdLineRef.current = chart.addSeries(LineSeries, {
      color: '#58a6ff',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    macdSignalRef.current = chart.addSeries(LineSeries, {
      color: '#d29922',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
  }, [showMacd]);

  // Sync time scale tra i pannelli
  useEffect(() => {
    const main = mainChartRef.current;
    if (!main) return undefined;
    const targets = [];
    if (showRsi && rsiChartRef.current) targets.push(rsiChartRef.current);
    if (showMacd && macdChartRef.current) targets.push(macdChartRef.current);
    return syncRange(main, targets);
  }, [showRsi, showMacd, syncRange, candles.length]);

  useEffect(() => {
    [mainChartRef, rsiChartRef, macdChartRef].forEach((ref) => {
      ref.current?.applyOptions(buildChartOptions(ref !== mainChartRef));
    });
    const up = cssVar('--up', '#3fb950');
    const down = cssVar('--down', '#f85149');
    candleRef.current?.applyOptions({
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    });
  }, [isDark]);

  const reqRef = useRef(0);
  const fitPendingRef = useRef(true);

  const fetchCandles = useCallback(
    async (silent = false) => {
      const my = ++reqRef.current;
      if (!silent) {
        setLoading(true);
        setError(null);
        fitPendingRef.current = true;
      }
      const params = new URLSearchParams({
        symbol,
        type,
        interval: tf.interval,
        range: tf.range,
      });
      try {
        const { data } = await apiFetch(`${API_BASE}/api/ohlc?${params}`);
        if (my !== reqRef.current) return;
        setCandles(Array.isArray(data?.candles) ? data.candles : []);
      } catch (e) {
        if (my !== reqRef.current) return;
        if (!silent) {
          setCandles([]);
          setError(e?.message || 'Candele non disponibili per questo asset.');
        }
      } finally {
        if (!silent && my === reqRef.current) setLoading(false);
      }
    },
    [symbol, type, tf.interval, tf.range]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCandles(false);
  }, [fetchCandles]);

  const fetchCompare = useCallback(async () => {
    const sym = compareInput.trim().toUpperCase();
    if (!sym || sym === symbol.toUpperCase()) {
      setCompareCandles([]);
      return;
    }
    const params = new URLSearchParams({
      symbol: sym,
      type,
      interval: tf.interval,
      range: tf.range,
    });
    try {
      const { data } = await apiFetch(`${API_BASE}/api/ohlc?${params}`);
      setCompareCandles(Array.isArray(data?.candles) ? data.candles : []);
    } catch {
      setCompareCandles([]);
    }
  }, [compareInput, symbol, type, tf.interval, tf.range]);

  useEffect(() => {
    fetchCompare();
  }, [fetchCompare]);

  useEffect(() => {
    const ms = tf.intraday ? 30_000 : 5 * 60_000;
    const tick = () => {
      if (document.visibilityState === 'visible') fetchCandles(true);
    };
    const id = setInterval(tick, ms);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCandles(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchCandles, tf.intraday]);

  // Candele + volumi
  useEffect(() => {
    const candle = candleRef.current;
    const volume = volumeRef.current;
    const chart = mainChartRef.current;
    if (!candle || !volume || !chart) return;
    chart.applyOptions({ timeScale: { timeVisible: tf.intraday, secondsVisible: false } });
    const upColor = cssVar('--up', '#3fb950');
    const downColor = cssVar('--down', '#f85149');
    if (!candles.length) {
      candle.setData([]);
      volume.setData([]);
      return;
    }
    candle.setData(
      candles.map((c) => ({
        time: c.time ?? c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    volume.setData(
      candles.map((c) => ({
        time: c.time ?? c.date,
        value: c.volume ?? 0,
        color: `color-mix(in srgb, ${c.close >= c.open ? upColor : downColor} 45%, transparent)`,
      }))
    );
    if (fitPendingRef.current) {
      chart.timeScale().fitContent();
      fitPendingRef.current = false;
    }
  }, [candles, isDark, tf.intraday]);

  // Overlay SMA/EMA
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart) return;
    OVERLAY_DEFS.forEach((def) => {
      const existing = overlayRefs.current[def.id];
      const active = activeOverlays.has(def.id);
      if (active && candles.length) {
        const data = overlayData(candles, def);
        if (existing) existing.setData(data);
        else {
          const s = chart.addSeries(LineSeries, {
            color: def.color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          s.setData(data);
          overlayRefs.current[def.id] = s;
        }
      } else if (existing) {
        chart.removeSeries(existing);
        delete overlayRefs.current[def.id];
      }
    });
  }, [activeOverlays, candles]);

  // Bollinger
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart || !indicatorData) return;
    const colors = { upper: '#58a6ff88', middle: '#8b949e', lower: '#58a6ff88' };
    ['upper', 'middle', 'lower'].forEach((band) => {
      const key = `bb-${band}`;
      const existing = bbRefs.current[key];
      if (showBb && candles.length) {
        const data = toLinePoints(candles, indicatorData.bb[band]);
        if (existing) existing.setData(data);
        else {
          const s = chart.addSeries(LineSeries, {
            color: colors[band],
            lineWidth: band === 'middle' ? 1 : 1,
            lineStyle: band === 'middle' ? 0 : 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          s.setData(data);
          bbRefs.current[key] = s;
        }
      } else if (existing) {
        chart.removeSeries(existing);
        delete bbRefs.current[key];
      }
    });
  }, [showBb, candles, indicatorData]);

  // Fibonacci retracement
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart) return;
    fibRefs.current.forEach((s) => chart.removeSeries(s));
    fibRefs.current = [];
    if (!showFib || !candles.length) return;
    const levels = fibonacciLevels(candles);
    const colors = ['#8b949e', '#58a6ff88', '#a371f788', '#d2992288', '#f778ba88', '#8b949e88', '#58a6ff'];
    levels.forEach((lvl, i) => {
      const s = chart.addSeries(LineSeries, {
        color: colors[i % colors.length],
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: lvl.label,
        crosshairMarkerVisible: false,
      });
      s.setData(candles.map((c) => ({ time: c.time ?? c.date, value: lvl.price })));
      fibRefs.current.push(s);
    });
  }, [showFib, candles]);

  // Confronto multi-asset (indice 100)
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart) return;
    if (compareRef.current) {
      chart.removeSeries(compareRef.current);
      compareRef.current = null;
    }
    if (!compareCandles.length) return;
    const data = normalizeCompareSeries(compareCandles);
    if (!data.length) return;
    const s = chart.addSeries(LineSeries, {
      color: '#f778ba',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: compareInput.toUpperCase(),
      crosshairMarkerVisible: false,
      priceScaleId: 'compare',
    });
    chart.priceScale('compare').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.4 } });
    s.setData(data);
    compareRef.current = s;
  }, [compareCandles, compareInput]);

  // RSI data
  useEffect(() => {
    if (!showRsi || !rsiLineRef.current || !indicatorData) return;
    rsiLineRef.current.setData(toLinePoints(candles, indicatorData.rsi));
    if (fitPendingRef.current) rsiChartRef.current?.timeScale().fitContent();
  }, [showRsi, candles, indicatorData]);

  // MACD data
  useEffect(() => {
    if (!showMacd || !indicatorData) return;
    const up = cssVar('--up', '#3fb950');
    const down = cssVar('--down', '#f85149');
    macdLineRef.current?.setData(toLinePoints(candles, indicatorData.macd.macdLine));
    macdSignalRef.current?.setData(toLinePoints(candles, indicatorData.macd.signalLine));
    macdHistRef.current?.setData(
      toHistPoints(candles, indicatorData.macd.histogram, up, down)
    );
    if (fitPendingRef.current) macdChartRef.current?.timeScale().fitContent();
  }, [showMacd, candles, indicatorData]);

  // Trendline / linea orizzontale: click sul grafico principale
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart || !candles.length) return undefined;
    if (!drawTrend && !drawHLine) return undefined;

    const handler = (param) => {
      if (!param.time) return;
      const c = candles.find((x) => (x.time ?? x.date) === param.time);
      if (!c) return;
      const price = c.close;

      if (drawHLine) {
        const series = chart.addSeries(LineSeries, {
          color: '#3fb950',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        const t0 = candles[0].time ?? candles[0].date;
        const t1 = candles[candles.length - 1].time ?? candles[candles.length - 1].date;
        series.setData([
          { time: t0, value: price },
          { time: t1, value: price },
        ]);
        hlineRefs.current.push(series);
        return;
      }

      setTrendPoints((prev) => {
        const next = [...prev, { time: param.time, price }];
        if (next.length < 2) return next;
        const [a, b] = next.slice(-2);
        const series = chart.addSeries(LineSeries, {
          color: '#d29922',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        series.setData([
          { time: a.time, value: a.price },
          { time: b.time, value: b.price },
        ]);
        trendlineRefs.current.push(series);
        return [];
      });
    };
    chart.subscribeClick(handler);
    return () => chart.unsubscribeClick(handler);
  }, [drawTrend, drawHLine, candles]);

  return (
    <div className="candle">
      <div className="candle__toolbar">
        <div className="candle__ranges" role="group" aria-label="Intervallo temporale">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`candle__range ${tfId === t.id ? 'is-active' : ''} ${t.intraday ? 'candle__range--intraday' : ''}`}
              onClick={() => setTfId(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="candle__tools">
          <input
            type="text"
            className="candle__compare-input"
            value={compareInput}
            onChange={(e) => setCompareInput(e.target.value.toUpperCase())}
            placeholder="Confronta es. MSFT"
            aria-label="Simbolo confronto"
          />
          <button
            type="button"
            className={`candle__tool ${drawTrend ? 'is-active' : ''}`}
            onClick={() => {
              setDrawTrend((v) => !v);
              setDrawHLine(false);
              setTrendPoints([]);
            }}
            title="Trendline: clicca due punti sul grafico"
          >
            ↗ Trend
          </button>
          <button
            type="button"
            className={`candle__tool ${drawHLine ? 'is-active' : ''}`}
            onClick={() => {
              setDrawHLine((v) => !v);
              setDrawTrend(false);
            }}
            title="Linea orizzontale: un click sul grafico"
          >
            ─ H-Line
          </button>
          <button
            type="button"
            className={`candle__tool ${showFib ? 'is-active' : ''}`}
            onClick={() => setShowFib((v) => !v)}
            title="Fibonacci retracement"
          >
            Fib
          </button>
          <button
            type="button"
            className="candle__tool"
            onClick={() => exportPng(stackRef.current, symbol)}
            disabled={!candles.length}
            title="Esporta PNG"
          >
            PNG
          </button>
          <button
            type="button"
            className="candle__tool"
            onClick={() => exportSvg(stackRef.current, symbol)}
            disabled={!candles.length}
            title="Esporta SVG"
          >
            SVG
          </button>
          <button
            type="button"
            className="candle__tool"
            onClick={() => exportCsv(candles, symbol)}
            disabled={!candles.length}
            title="Esporta CSV"
          >
            CSV
          </button>
        </div>
      </div>

      <div className="candle__toolbar candle__toolbar--secondary">
        <div className="candle__overlays" role="group" aria-label="Overlay prezzo">
          {OVERLAY_DEFS.map((def) => (
            <button
              key={def.id}
              type="button"
              className={`candle__overlay ${activeOverlays.has(def.id) ? 'is-active' : ''}`}
              onClick={() => toggleOverlay(def.id)}
              style={
                activeOverlays.has(def.id)
                  ? { borderColor: def.color, color: def.color }
                  : undefined
              }
            >
              <span className="candle__overlay-dot" style={{ background: def.color }} />
              {def.label}
            </button>
          ))}
        </div>
        <div className="candle__overlays" role="group" aria-label="Pannelli indicatori">
          {PANEL_DEFS.map((def) => (
            <button
              key={def.id}
              type="button"
              className={`candle__overlay ${activePanels.has(def.id) ? 'is-active' : ''}`}
              onClick={() => togglePanel(def.id)}
            >
              {def.label}
            </button>
          ))}
        </div>
      </div>

      {tip && (
        <div className="candle__tooltip" role="status">
          <span>O {formatTipNum(tip.open)}</span>
          <span>H {formatTipNum(tip.high)}</span>
          <span>L {formatTipNum(tip.low)}</span>
          <span>C {formatTipNum(tip.close)}</span>
          {tip.volume != null && <span>V {formatTipNum(tip.volume, 0)}</span>}
        </div>
      )}

      <div className="candle__stack" ref={stackRef}>
        <div className="candle__canvas-wrap" style={{ height: mainHeight }}>
          <div ref={mainRef} className="candle__canvas" />
          {loading && !candles.length && (
            <div className="candle__state candle__state--skel">
              <ChartWidgetSkeleton label="Caricamento candele…" tall />
            </div>
          )}
          {loading && candles.length > 0 && (
            <div className="candle__state candle__state--refresh">Aggiornamento…</div>
          )}
          {!loading && error && <div className="candle__state candle__state--error">{error}</div>}
          {!loading && !error && !candles.length && (
            <div className="candle__state">Nessun dato OHLC per questo asset.</div>
          )}
          {drawTrend && (
            <div className="candle__draw-hint">Clicca due punti per tracciare una trendline</div>
          )}
          {drawHLine && (
            <div className="candle__draw-hint">Clicca un punto per una linea orizzontale</div>
          )}
        </div>

        {showRsi && (
          <div className="candle__pane">
            <span className="candle__pane-label">RSI (14)</span>
            <div className="candle__pane-canvas" ref={rsiRef} />
          </div>
        )}
        {showMacd && (
          <div className="candle__pane">
            <span className="candle__pane-label">MACD (12, 26, 9)</span>
            <div className="candle__pane-canvas" ref={macdRef} />
          </div>
        )}
      </div>

      <p className="candle__hint">
        {!loading && !error && candles.length > 0 && (
          <span className="candle__live">
            <span className="candle__live-dot" aria-hidden="true" />
            Auto-refresh {tf.intraday ? '30s' : '5min'}
          </span>
        )}
        Scroll zoom · drag pan · doppio click reset
        {compareInput ? ` · confronto ${compareInput}` : ''}.
      </p>
    </div>
  );
}
