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

/** Aggiunge campi ema20, ema50, sma20 in unità display al dataset del grafico. */
export function enrichChartWithOverlays(rows, { ema20, ema50, sma20 }, fx, meta, currency) {
  if (!rows?.length) return rows;
  const raw = rows.map((r) => r.price);
  const ema20s = ema20 ? emaSeries(raw, 20) : null;
  const ema50s = ema50 ? emaSeries(raw, 50) : null;
  const sma20s = sma20 ? smaSeries(raw, 20) : null;

  return rows.map((row, i) => ({
    ...row,
    ema20:
      ema20s?.[i] != null ? toDisplayPrice(ema20s[i], fx, meta, currency) : null,
    ema50:
      ema50s?.[i] != null ? toDisplayPrice(ema50s[i], fx, meta, currency) : null,
    sma20:
      sma20s?.[i] != null ? toDisplayPrice(sma20s[i], fx, meta, currency) : null,
  }));
}
