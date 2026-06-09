/**
 * LSTM leggero (1 layer) — addestramento online su serie prezzi.
 * Input: finestra normalizzata di rendimenti log; output: passo successivo.
 */

const MIN_POINTS = 28;
const DEFAULT_LOOKBACK = 14;
const HIDDEN = 16;
const EPOCHS = 32;
const LR = 0.008;

function cleanPrices(prices) {
  return (prices || []).map(Number).filter((p) => Number.isFinite(p) && p > 0);
}

function logReturns(prices) {
  const r = [];
  for (let i = 1; i < prices.length; i++) {
    r.push(Math.log(prices[i] / prices[i - 1]));
  }
  return r;
}

function meanStd(arr) {
  const n = arr.length;
  if (!n) return { mean: 0, std: 1 };
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance) || 1e-6;
  return { mean, std };
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
}

function tanh(x) {
  return Math.tanh(x);
}

function seriesSeed(prices) {
  return Math.abs(prices.reduce((acc, p, i) => acc + p * (i + 1) * 997, 0)) | 0 || 1;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

/** Cella LSTM singola con pesi inizializzati Xavier-like (seed da serie). */
function createLstm(inputSize, hiddenSize, seed) {
  const scale = (n) => Math.sqrt(2 / n);
  const rnd = seededRandom(seed);
  const w = (n) => rnd() * scale(n);

  return {
    inputSize,
    hiddenSize,
    Wf: Array.from({ length: hiddenSize }, () => w(inputSize + hiddenSize)),
    Wi: Array.from({ length: hiddenSize }, () => w(inputSize + hiddenSize)),
    Wo: Array.from({ length: hiddenSize }, () => w(inputSize + hiddenSize)),
    Wc: Array.from({ length: hiddenSize }, () => w(inputSize + hiddenSize)),
    Wy: Array.from({ length: hiddenSize }, () => w(hiddenSize)),
    by: w(1),
    h: new Array(hiddenSize).fill(0),
    c: new Array(hiddenSize).fill(0),
  };
}

function lstmForward(lstm, x) {
  const { hiddenSize, h, c } = lstm;
  const concat = [...x, ...h];
  const f = [];
  const i = [];
  const o = [];
  const cHat = [];

  for (let u = 0; u < hiddenSize; u++) {
    let sumF = 0;
    let sumI = 0;
    let sumO = 0;
    let sumC = 0;
    for (let k = 0; k < concat.length; k++) {
      sumF += lstm.Wf[u] * concat[k];
      sumI += lstm.Wi[u] * concat[k];
      sumO += lstm.Wo[u] * concat[k];
      sumC += lstm.Wc[u] * concat[k];
    }
    f[u] = sigmoid(sumF);
    i[u] = sigmoid(sumI);
    o[u] = sigmoid(sumO);
    cHat[u] = tanh(sumC);
    c[u] = f[u] * c[u] + i[u] * cHat[u];
    h[u] = o[u] * tanh(c[u]);
  }

  let y = lstm.by;
  for (let u = 0; u < hiddenSize; u++) y += lstm.Wy[u] * h[u];
  return y;
}

function resetState(lstm) {
  lstm.h.fill(0);
  lstm.c.fill(0);
}

function buildSequences(returns, lookback) {
  const xs = [];
  const ys = [];
  const { mean, std } = meanStd(returns);
  for (let t = lookback; t < returns.length; t++) {
    const window = returns.slice(t - lookback, t).map((v) => (v - mean) / std);
    xs.push(window);
    ys.push((returns[t] - mean) / std);
  }
  return { xs, ys, mean, std };
}

function trainLstm(lstm, xs, ys, epochs) {
  let lastLoss = 0;
  for (let ep = 0; ep < epochs; ep++) {
    let loss = 0;
    for (let s = 0; s < xs.length; s++) {
      resetState(lstm);
      const x = xs[s];
      const target = ys[s];
      const pred = lstmForward(lstm, x);
      const err = pred - target;
      loss += err * err;

      const lr = LR / (1 + ep * 0.05);
      for (let u = 0; u < lstm.hiddenSize; u++) {
        lstm.Wy[u] -= lr * err * lstm.h[u];
        lstm.by -= lr * err;
      }
      const concat = [...x, ...lstm.h];
      for (let u = 0; u < lstm.hiddenSize; u++) {
        const grad = lr * err * lstm.Wy[u];
        for (let k = 0; k < concat.length; k++) {
          lstm.Wf[u] -= grad * concat[k] * 0.25;
          lstm.Wi[u] -= grad * concat[k] * 0.25;
          lstm.Wo[u] -= grad * concat[k] * 0.25;
          lstm.Wc[u] -= grad * concat[k] * 0.25;
        }
      }
    }
    lastLoss = loss / Math.max(xs.length, 1);
  }
  return lastLoss;
}

/**
 * @param {number[]} prices
 * @param {number} horizonDays
 */
export function lstmForecast(prices, horizonDays = 5, windowSize = null) {
  const all = cleanPrices(prices);
  if (all.length < MIN_POINTS) return null;

  const w =
    windowSize != null && windowSize >= MIN_POINTS
      ? Math.min(windowSize, all.length)
      : all.length;
  const series = all.slice(-w);
  const total = all.length;
  const returns = logReturns(series);
  const lookback = Math.min(DEFAULT_LOOKBACK, Math.max(6, Math.floor(returns.length / 4)));

  if (returns.length < lookback + 8) return null;

  const { xs, ys, mean, std } = buildSequences(returns, lookback);
  if (xs.length < 5) return null;

  const lstm = createLstm(lookback, HIDDEN, seriesSeed(series));
  const trainLoss = trainLstm(lstm, xs, ys, EPOCHS);

  resetState(lstm);
  let lastWindow = returns.slice(-lookback).map((v) => (v - mean) / std);
  let lastPrice = series[series.length - 1];
  const forecasts = [];

  for (let h = 1; h <= horizonDays; h++) {
    const predNorm = lstmForward(lstm, lastWindow);
    const predReturn = predNorm * std + mean;
    lastPrice = lastPrice * Math.exp(predReturn);
    forecasts.push({
      dayOffset: h,
      dayIndex: total + h,
      price: Number(Math.max(lastPrice, 1e-8).toFixed(6)),
    });
    lastWindow = [...lastWindow.slice(1), predNorm];
  }

  return {
    lookback,
    hiddenSize: HIDDEN,
    epochs: EPOCHS,
    trainLoss: Number(trainLoss.toFixed(6)),
    window: w,
    nextPrice: forecasts[0]?.price ?? null,
    forecasts,
    formula: `LSTM(${HIDDEN}, lookback=${lookback})`,
  };
}
