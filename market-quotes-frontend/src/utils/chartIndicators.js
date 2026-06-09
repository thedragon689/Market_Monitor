/** Serie indicatori client-side per overlay sul grafico storico. */
import { toDisplayPrice } from './chartAxis';

function cleanPrices(prices) {
  return (prices || []).map(Number).filter((p) => Number.isFinite(p));
}

export function emaSeries(prices, period) {
  const data = cleanPrices(prices);
  const out = new Array(data.length).fill(null);
  if (data.length < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  let ema = sum / period;
  out[period - 1] = ema;

  const k = 2 / (period + 1);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

export function smaSeries(prices, period) {
  const data = cleanPrices(prices);
  const out = new Array(data.length).fill(null);
  if (data.length < period) return out;
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    out[i] = slice.reduce((a, b) => a + b, 0) / period;
  }
  return out;
}

function stdDev(slice) {
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

export function bollingerSeries(prices, period = 20, mult = 2) {
  const data = cleanPrices(prices);
  const upper = new Array(data.length).fill(null);
  const middle = new Array(data.length).fill(null);
  const lower = new Array(data.length).fill(null);
  if (data.length < period) return { upper, middle, lower };

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mid = slice.reduce((a, b) => a + b, 0) / period;
    const sd = stdDev(slice);
    middle[i] = mid;
    upper[i] = mid + mult * sd;
    lower[i] = mid - mult * sd;
  }
  return { upper, middle, lower };
}

/** Aggiunge campi overlay in unità display al dataset del grafico. */
export function enrichChartWithOverlays(
  rows,
  { ema20, ema50, ema200, sma20, bollinger },
  fx,
  meta,
  currency
) {
  if (!rows?.length) return rows;
  const raw = rows.map((r) => r.price);
  const ema20s = ema20 ? emaSeries(raw, 20) : null;
  const ema50s = ema50 ? emaSeries(raw, 50) : null;
  const ema200s = ema200 ? emaSeries(raw, 200) : null;
  const sma20s = sma20 ? smaSeries(raw, 20) : null;
  const bb = bollinger ? bollingerSeries(raw, 20, 2) : null;

  return rows.map((row, i) => ({
    ...row,
    ema20:
      ema20s?.[i] != null ? toDisplayPrice(ema20s[i], fx, meta, currency) : null,
    ema50:
      ema50s?.[i] != null ? toDisplayPrice(ema50s[i], fx, meta, currency) : null,
    ema200:
      ema200s?.[i] != null ? toDisplayPrice(ema200s[i], fx, meta, currency) : null,
    sma20:
      sma20s?.[i] != null ? toDisplayPrice(sma20s[i], fx, meta, currency) : null,
    bbUpper:
      bb?.upper[i] != null ? toDisplayPrice(bb.upper[i], fx, meta, currency) : null,
    bbMiddle:
      bb?.middle[i] != null ? toDisplayPrice(bb.middle[i], fx, meta, currency) : null,
    bbLower:
      bb?.lower[i] != null ? toDisplayPrice(bb.lower[i], fx, meta, currency) : null,
  }));
}
