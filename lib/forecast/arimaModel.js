/**
 * ARIMA(p,d,q) — stima OLS per AR(p), CSS per componente MA.
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

function gaussianSolve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) return null;

    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

/** OLS: y_t = φ₁y_{t-1} + … + φ_p y_{t-p} */
function olsArCoeffs(y, p) {
  const n = y.length;
  if (p === 0) {
    const mean = y.reduce((a, b) => a + b, 0) / n;
    return { phi: [], theta: [], sse: 0, residuals: y.map((v) => v - mean), mean };
  }
  if (n <= p + 2) return null;

  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);

  for (let t = p; t < n; t++) {
    const x = [];
    for (let i = 1; i <= p; i++) x.push(y[t - i]);
    const yt = y[t];
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) XtX[i][j] += x[i] * x[j];
      Xty[i] += x[i] * yt;
    }
  }

  const phi = gaussianSolve(XtX, Xty);
  if (!phi) return null;

  const residuals = new Array(n).fill(0);
  let sse = 0;
  let count = 0;
  for (let t = p; t < n; t++) {
    let pred = 0;
    for (let i = 1; i <= p; i++) pred += phi[i - 1] * y[t - i];
    const err = y[t] - pred;
    residuals[t] = err;
    sse += err * err;
    count += 1;
  }

  return {
    phi,
    theta: [],
    sse: count > 0 ? sse / count : Infinity,
    residuals,
    mean: y.reduce((a, b) => a + b, 0) / n,
  };
}

/** CSS per ARMA(p,q) con coefficienti vettoriali φ e θ. */
function armaCss(y, p, q) {
  const n = y.length;
  const maxLag = Math.max(p, q);
  if (n <= maxLag + 2) return null;

  if (q === 0) return olsArCoeffs(y, p);

  const phiGrid =
    p > 0 ? [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9] : [0];
  const thetaGrid =
    q > 0 ? [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9] : [0];

  let best = null;

  for (const ph of phiGrid) {
    for (const th of thetaGrid) {
      const phi = p > 0 ? Array.from({ length: p }, () => ph) : [];
      const theta = q > 0 ? Array.from({ length: q }, () => th) : [];
      const e = new Array(n).fill(0);
      let sse = 0;
      let count = 0;

      for (let t = maxLag; t < n; t++) {
        let pred = 0;
        for (let i = 1; i <= p; i++) pred += phi[i - 1] * y[t - i];
        for (let j = 1; j <= q; j++) pred += theta[j - 1] * e[t - j];
        const err = y[t] - pred;
        e[t] = err;
        sse += err * err;
        count += 1;
      }

      if (count > 0 && (!best || sse / count < best.sse)) {
        best = {
          phi,
          theta,
          sse: sse / count,
          residuals: e,
          mean: y.reduce((a, b) => a + b, 0) / n,
        };
      }
    }
  }

  return best;
}

function selectOrder(y) {
  const candidates = [
    { p: 1, d: 1, q: 1 },
    { p: 1, d: 1, q: 0 },
    { p: 0, d: 1, q: 1 },
    { p: 1, d: 0, q: 0 },
  ];
  let best = { p: 1, d: 1, q: 1, aic: Infinity };

  for (const c of candidates) {
    const diffed = difference(y, c.d);
    if (!diffed || diffed.length < 8) continue;
    const fit = armaCss(diffed, c.p, c.q);
    if (!fit) continue;

    const maxLag = Math.max(c.p, c.q);
    const n = Math.max(1, diffed.length - maxLag);
    const k = c.p + c.q + 1;
    const sse = Math.max(fit.sse, 1e-12);
    const aic = n * Math.log(sse) + 2 * k;

    if (aic < best.aic) {
      best = { ...c, aic, sse: fit.sse, fit, diffed };
    }
  }
  return best;
}

function forecastDiff(fit, diffed, p, q, horizon) {
  const phi = fit.phi ?? [];
  const theta = fit.theta ?? [];
  const y = [...diffed];
  const e = [...fit.residuals];
  const out = [];

  for (let h = 0; h < horizon; h++) {
    const t = y.length;
    let pred = 0;
    for (let i = 1; i <= p; i++) pred += phi[i - 1] * y[t - i];
    for (let j = 1; j <= q; j++) pred += theta[j - 1] * e[t - j];
    out.push(pred);
    y.push(pred);
    e.push(0);
  }
  return out;
}

function integrateLevels(levels, diffForecasts) {
  const result = [];
  let last = levels[levels.length - 1];
  for (const delta of diffForecasts) {
    last += delta;
    result.push(last);
  }
  return result;
}

function scalarCoeff(arr) {
  if (!arr?.length) return null;
  return arr.length === 1 ? Number(arr[0].toFixed(4)) : arr.map((v) => Number(v.toFixed(4)));
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

  const { p, d, q, fit, diffed, aic } = selectOrder(series);
  if (!fit || !diffed) return null;

  const diffFc = forecastDiff(fit, diffed, p, q, horizonDays);
  const priceForecasts = d > 0 ? integrateLevels(series, diffFc) : diffFc;

  const forecasts = priceForecasts.map((price, i) => ({
    dayOffset: i + 1,
    dayIndex: total + i + 1,
    price: Number(Math.max(price, 1e-8).toFixed(6)),
  }));

  return {
    order: { p, d, q },
    window: w,
    phi: scalarCoeff(fit.phi),
    theta: scalarCoeff(fit.theta),
    coefficients: { phi: fit.phi, theta: fit.theta },
    aic: Number((aic ?? fit.sse * diffed.length).toFixed(4)),
    fittedAtEnd: forecasts[0] ? forecasts[0].price - diffFc[0] : series[series.length - 1],
    nextPrice: forecasts[0]?.price ?? null,
    forecasts,
    formula: `ARIMA(${p},${d},${q})`,
  };
}
