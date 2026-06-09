/**
 * Indicatori tecnici (SMA, EMA, RSI, MACD, Bollinger).
 * Usati da /api/analyze, risk engine e alert.
 */

function cleanPrices(prices) {
  return (prices || []).map(Number).filter((p) => Number.isFinite(p));
}

/** Media mobile semplice sull'ultimo valore. */
export function sma(prices, period) {
  const data = cleanPrices(prices);
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return Number((slice.reduce((a, b) => a + b, 0) / period).toFixed(6));
}

/** Serie EMA allineata agli indici dei prezzi (undefined fino a period-1). */
function emaSeries(prices, period) {
  const data = cleanPrices(prices);
  const out = new Array(data.length).fill(undefined);
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

/** EMA sull'ultimo valore. */
export function ema(prices, period) {
  const series = emaSeries(prices, period);
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] != null) return Number(series[i].toFixed(6));
  }
  return null;
}

/** RSI (14) — smoothing Wilder (standard industria). */
export function rsi(prices, period = 14) {
  const data = cleanPrices(prices);
  if (data.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(4));
}

/** MACD (12, 26, 9) — ultimi valori linea, signal, istogramma. */
export function macd(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const data = cleanPrices(prices);
  if (data.length < slowPeriod + signalPeriod) return null;

  const emaFast = emaSeries(data, fastPeriod);
  const emaSlow = emaSeries(data, slowPeriod);

  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    if (emaFast[i] != null && emaSlow[i] != null) {
      macdLine.push(emaFast[i] - emaSlow[i]);
    }
  }
  if (macdLine.length < signalPeriod) return null;

  const signalSeries = emaSeries(macdLine, signalPeriod);
  const macdLast = macdLine[macdLine.length - 1];
  const signalLast = signalSeries[signalSeries.length - 1];
  if (signalLast == null) return null;

  return {
    macdLine: Number(macdLast.toFixed(6)),
    signal: Number(signalLast.toFixed(6)),
    histogram: Number((macdLast - signalLast).toFixed(6)),
  };
}

/** Bande di Bollinger sull'ultima finestra. */
export function bollinger(prices, period = 20, stdDevMult = 2) {
  const data = cleanPrices(prices);
  if (data.length < period) return null;

  const slice = data.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((acc, p) => acc + (p - middle) ** 2, 0) / period;
  const sd = Math.sqrt(variance);

  return {
    upper: Number((middle + stdDevMult * sd).toFixed(6)),
    middle: Number(middle.toFixed(6)),
    lower: Number((middle - stdDevMult * sd).toFixed(6)),
  };
}

/** Commodity Channel Index (20). */
export function cci(prices, period = 20) {
  const data = cleanPrices(prices);
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const tp = slice;
  const smaTp = tp.reduce((a, b) => a + b, 0) / period;
  const meanDev = tp.reduce((s, p) => s + Math.abs(p - smaTp), 0) / period;
  if (!meanDev) return 0;
  const last = tp[tp.length - 1];
  return Number((((last - smaTp) / (0.015 * meanDev))).toFixed(2));
}

/** Williams %R (14). */
export function williamsR(prices, period = 14) {
  const data = cleanPrices(prices);
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const high = Math.max(...slice);
  const low = Math.min(...slice);
  const close = slice[slice.length - 1];
  if (high === low) return -50;
  return Number((((high - close) / (high - low)) * -100).toFixed(2));
}

/** ATR su true range da soli close (proxy). */
export function atr(prices, period = 14) {
  const data = cleanPrices(prices);
  if (data.length < period + 1) return null;
  const trs = [];
  for (let i = data.length - period; i < data.length; i++) {
    trs.push(Math.abs(data[i] - data[i - 1]));
  }
  const value = trs.reduce((a, b) => a + b, 0) / period;
  const last = data[data.length - 1];
  return {
    value: Number(value.toFixed(6)),
    pctOfPrice: last ? Number(((value / last) * 100).toFixed(3)) : null,
    period,
  };
}

/** Momentum (14) — variazione % su 14 periodi. */
export function momentum(prices, period = 14) {
  const data = cleanPrices(prices);
  if (data.length < period + 1) return null;
  const last = data[data.length - 1];
  const prev = data[data.length - 1 - period];
  if (!prev) return null;
  return Number((((last - prev) / prev) * 100).toFixed(3));
}

/** Pacchetto indicatori per API/UI. */
export function computeIndicators(prices) {
  const data = cleanPrices(prices);
  if (data.length < 2) {
    return {
      sma14: null,
      sma20: null,
      ema14: null,
      ema20: null,
      rsi14: null,
      macd: null,
      bollinger: null,
      cci20: null,
      williamsR14: null,
      atr14: null,
      momentum14: null,
    };
  }

  return {
    sma14: sma(data, 14),
    sma20: sma(data, 20),
    ema14: ema(data, 14),
    ema20: ema(data, 20),
    rsi14: rsi(data, 14),
    macd: macd(data),
    bollinger: bollinger(data, 20),
    cci20: cci(data, 20),
    williamsR14: williamsR(data, 14),
    atr14: atr(data, 14),
    momentum14: momentum(data, 14),
  };
}

/** Indicatori estesi per materie prime. */
export function computeCommodityIndicators(prices) {
  return computeIndicators(prices);
}
