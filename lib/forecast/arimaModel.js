/**
 * ARIMA(p,d,q) — stima CSS, ordine auto su griglia ridotta.
 * Integrazione con pipeline previsioni (stesso formato di linearForecast).
 */

const MIN_POINTS = 18;

function cleanPrices(prices) {
  return (prices || []).map(Number).filter((p) => Number.isFinite(p) && p > 0);
}

function difference(series, order) {
  let y = series.slice();
  for (let d = 0; d < order; d++) {
    const next = [];
    for (let i = 1; i < y.length; i++) next.push(y[i] - y[i - 1]);
    y = next;
    if (y.length < 3) return null;
  }
  return y;
}

/** SSE per ARMA(p,q) su serie già differenziata (conditional least squares). */
function armaCss(y, p, q) {
  const n = y.length;
  const maxLag = Math.max(p, q);
  if (n <= maxLag + 2) return null;

  const residuals = new Array(n).fill(0);
  let sse = 0;
  let count = 0;

  const phi = p >= 1 ? 0.4 : 0;
  const theta = q >= 1 ? 0.2 : 0;

  const gridPhi = p > 0 ? [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9] : [0];
  const gridTheta = q > 0 ? [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9] : [0];

  let bestPhi = phi;
  let bestTheta = theta;
  let bestSse = Infinity;
  let bestRes = residuals;

  for (const ph of gridPhi) {
    for (const th of gridTheta) {
      const e = new Array(n).fill(0);
      let s = 0;
      let c = 0;
      for (let t = maxLag; t < n; t++) {
        let pred = 0;
        for (let i = 1; i <= p; i++) pred += ph * y[t - i];
        for (let j = 1; j <= q; j++) pred += th * e[t - j];
        const err = y[t] - pred;
        e[t] = err;
        s += err * err;
        c += 1;
      }
      if (c > 0 && s / c < bestSse) {
        bestSse = s / c;
        bestPhi = ph;
        bestTheta = th;
        bestRes = e;
      }
    }
  }

  return {
    phi: bestPhi,
    theta: bestTheta,
    sse: bestSse,
    residuals: bestRes,
    mean: y.reduce((a, b) => a + b, 0) / n,
  };
}

function selectOrder(y) {
  const candidates = [
    { p: 1, d: 1, q: 1 },
    { p: 1, d: 1, q: 0 },
    { p: 0, d: 1, q: 1 },
    { p: 1, d: 0, q: 0 },
  ];
  let best = { p: 1, d: 1, q: 1, sse: Infinity };

  for (const c of candidates) {
    const diffed = difference(y, c.d);
    if (!diffed || diffed.length < 8) continue;
    const fit = armaCss(diffed, c.p, c.q);
    if (fit && fit.sse < best.sse) {
      best = { ...c, sse: fit.sse, fit, diffed };
    }
  }
  return best;
}

function forecastDiff(fit, diffed, p, q, horizon) {
  const y = [...diffed];
  const e = [...fit.residuals];
  const out = [];

  for (let h = 0; h < horizon; h++) {
    const t = y.length;
    let pred = 0;
    if (p >= 1) pred += fit.phi * y[t - 1];
    if (q >= 1) pred += fit.theta * e[t - 1];
    out.push(pred);
    y.push(pred);
    e.push(0);
  }
  return out;
}

function integrateLevels(levels, diffForecasts, d) {
  const result = [];
  let last = levels[levels.length - 1];
  for (const delta of diffForecasts) {
    last += delta;
    result.push(last);
  }
  return result;
}

/**
 * @param {number[]} prices
 * @param {number} horizonDays
 * @param {number|null} windowSize — usa ultimi N punti per il fit
 */
export function arimaForecast(prices, horizonDays = 5, windowSize = null) {
  const all = cleanPrices(prices);
  if (all.length < MIN_POINTS) return null;

  const w =
    windowSize != null && windowSize >= MIN_POINTS
      ? Math.min(windowSize, all.length)
      : all.length;
  const series = all.slice(-w);
  const total = all.length;

  const { p, d, q, fit, diffed } = selectOrder(series);
  if (!fit || !diffed) return null;

  const diffFc = forecastDiff(fit, diffed, p, q, horizonDays);
  const baseLevels = d > 0 ? series : series;
  const priceForecasts = d > 0 ? integrateLevels(baseLevels, diffFc, d) : diffFc;

  const forecasts = priceForecasts.map((price, i) => ({
    dayOffset: i + 1,
    dayIndex: total + i + 1,
    price: Number(Math.max(price, 1e-8).toFixed(6)),
  }));

  return {
    order: { p, d, q },
    window: w,
    phi: Number(fit.phi.toFixed(4)),
    theta: Number(fit.theta.toFixed(4)),
    aic: Number((fit.sse * diffed.length).toFixed(4)),
    fittedAtEnd: forecasts[0] ? forecasts[0].price - diffFc[0] : series[series.length - 1],
    nextPrice: forecasts[0]?.price ?? null,
    forecasts,
    formula: `ARIMA(${p},${d},${q})`,
  };
}
