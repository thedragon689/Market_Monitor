/** Serie indicatori per lightweight-charts (allineate alle candele OHLC). */

import { toDisplayPrice } from './chartAxis';

function candleTime(c) {
  return c.time ?? c.date;
}

function emaSeries(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += values[i];
  let ema = sum / period;
  out[period - 1] = ema;
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i += 1) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

function smaSeries(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** RSI Wilder — array valori per indice (null fino a period). */
export function rsiSeries(candles, period = 14) {
  const closes = candles.map((c) => c.close);
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** MACD completo: linea, signal, istogramma per ogni indice. */
export function macdSeries(candles, fast = 12, slow = 26, signal = 9) {
  const closes = candles.map((c) => c.close);
  const emaFast = emaSeries(closes, fast);
  const emaSlow = emaSeries(closes, slow);
  const macdLine = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null
  );

  const macdValues = macdLine.filter((v) => v != null);
  const signalOnMacd = emaSeries(macdValues, signal);
  let sigIdx = 0;
  const signalLine = macdLine.map((v) => {
    if (v == null) return null;
    const s = signalOnMacd[sigIdx];
    sigIdx += 1;
    return s;
  });

  const histogram = macdLine.map((m, i) =>
    m != null && signalLine[i] != null ? m - signalLine[i] : null
  );

  return { macdLine, signalLine, histogram };
}

export function bollingerSeries(candles, period = 20, mult = 2) {
  const closes = candles.map((c) => c.close);
  const upper = new Array(closes.length).fill(null);
  const middle = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i += 1) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mid = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((acc, p) => acc + (p - mid) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    middle[i] = mid;
    upper[i] = mid + mult * sd;
    lower[i] = mid - mult * sd;
  }
  return { upper, middle, lower };
}

/** Livelli Fibonacci su swing high/low recenti. */
export function fibonacciLevels(candles, lookback = 60) {
  if (!candles?.length) return [];
  const slice = candles.slice(-Math.min(lookback, candles.length));
  const high = Math.max(...slice.map((c) => c.high));
  const low = Math.min(...slice.map((c) => c.low));
  const diff = high - low;
  const ratios = [
    { ratio: 0, label: '0%' },
    { ratio: 0.236, label: '23.6%' },
    { ratio: 0.382, label: '38.2%' },
    { ratio: 0.5, label: '50%' },
    { ratio: 0.618, label: '61.8%' },
    { ratio: 0.786, label: '78.6%' },
    { ratio: 1, label: '100%' },
  ];
  return ratios.map(({ ratio, label }) => ({
    ratio,
    label,
    price: high - diff * ratio,
  }));
}

/** Normalizza serie a indice 100 al primo punto (confronto multi-asset). */
export function normalizeCompareSeries(candles) {
  if (!candles?.length) return [];
  const base = candles[0].close;
  if (!base) return [];
  return candles.map((c) => ({
    time: candleTime(c),
    value: (c.close / base) * 100,
  }));
}

export function toLinePoints(candles, values) {
  const out = [];
  for (let i = 0; i < candles.length; i += 1) {
    if (values[i] == null) continue;
    out.push({ time: candleTime(candles[i]), value: values[i] });
  }
  return out;
}

export function toHistPoints(candles, values, colorPos, colorNeg) {
  const out = [];
  for (let i = 0; i < candles.length; i += 1) {
    if (values[i] == null) continue;
    const v = values[i];
    out.push({
      time: candleTime(candles[i]),
      value: v,
      color: v >= 0 ? colorPos : colorNeg,
    });
  }
  return out;
}

/** Arricchisce righe storico Recharts con overlay SMA/EMA/Bollinger (HistoryChart). */
export function enrichChartWithOverlays(rows, overlays, fx, meta, currency) {
  if (!rows?.length) return rows;
  const prices = rows.map((r) => r.price);
  const cv = (p) =>
    p != null && Number.isFinite(Number(p)) ? toDisplayPrice(p, fx, meta, currency) : null;

  const needSma20 = overlays?.sma20;
  const needEma20 = overlays?.ema20;
  const needEma50 = overlays?.ema50;
  const needEma200 = overlays?.ema200;
  const needBb = overlays?.bollinger;

  const s20 = needSma20 ? smaSeries(prices, 20) : null;
  const e20 = needEma20 ? emaSeries(prices, 20) : null;
  const e50 = needEma50 ? emaSeries(prices, 50) : null;
  const e200 = needEma200 ? emaSeries(prices, 200) : null;
  const bb = needBb ? bollingerSeriesFromPrices(prices) : null;

  return rows.map((row, i) => ({
    ...row,
    ...(needSma20 && s20[i] != null ? { sma20: cv(s20[i]) } : {}),
    ...(needEma20 && e20[i] != null ? { ema20: cv(e20[i]) } : {}),
    ...(needEma50 && e50[i] != null ? { ema50: cv(e50[i]) } : {}),
    ...(needEma200 && e200[i] != null ? { ema200: cv(e200[i]) } : {}),
    ...(needBb && bb.upper[i] != null
      ? {
          bbUpper: cv(bb.upper[i]),
          bbMiddle: cv(bb.middle[i]),
          bbLower: cv(bb.lower[i]),
        }
      : {}),
  }));
}

function bollingerSeriesFromPrices(prices, period = 20, mult = 2) {
  const upper = new Array(prices.length).fill(null);
  const middle = new Array(prices.length).fill(null);
  const lower = new Array(prices.length).fill(null);
  for (let i = period - 1; i < prices.length; i += 1) {
    const slice = prices.slice(i - period + 1, i + 1).map(Number);
    const mid = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((acc, p) => acc + (p - mid) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    middle[i] = mid;
    upper[i] = mid + mult * sd;
    lower[i] = mid - mult * sd;
  }
  return { upper, middle, lower };
}
