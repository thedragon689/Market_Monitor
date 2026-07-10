/**
 * Random Forest leggero (JS puro): alberi con split su feature casuali.
 * Target: rendimento logaritmico del giorno successivo (stazionario).
 * Feature: rendimenti lag, SMA ratio, sentiment, vol.
 */

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function seriesSeed(prices) {
  return Math.abs(prices.reduce((acc, p, i) => acc + p * (i + 1) * 131, 0)) | 0 || 1;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function featuresAt(prices, i, extras = {}) {
  const ret1 = (prices[i] - prices[i - 1]) / prices[i - 1];
  const ret5 = (prices[i] - prices[i - 5]) / prices[i - 5];
  const sma5 = prices.slice(i - 4, i + 1).reduce((a, b) => a + b, 0) / 5;
  const smaRatio = prices[i] / sma5 - 1;
  return [
    ret1,
    ret5,
    smaRatio,
    extras.sentiment ?? 0,
    extras.volatility ?? 0,
    extras.geoImpact ?? 0,
  ];
}

/** Campioni (feature_t → log-return_{t+1}). */
function buildFeatures(prices, extras = {}) {
  const n = prices.length;
  const f = [];
  for (let i = 5; i < n - 1; i++) {
    const y = Math.log(prices[i + 1] / prices[i]);
    if (!Number.isFinite(y)) continue;
    f.push({ y, x: featuresAt(prices, i, extras) });
  }
  return f;
}

function trainTree(data, maxDepth = 4, rnd = Math.random) {
  function build(subset, depth) {
    const ys = subset.map((r) => r.y);
    const value = mean(ys);
    if (depth >= maxDepth || subset.length < 6) return { value };

    const fi = Math.floor(rnd() * subset[0].x.length);
    const vals = subset.map((r) => r.x[fi]).sort((a, b) => a - b);
    const th = vals[Math.floor(vals.length / 2)] ?? 0;

    const left = subset.filter((r) => r.x[fi] <= th);
    const right = subset.filter((r) => r.x[fi] > th);
    if (!left.length || !right.length) return { value };

    return {
      split: { fi, th },
      left: build(left, depth + 1),
      right: build(right, depth + 1),
    };
  }

  const tree = build(data, 0);
  return (features) => {
    let node = tree;
    while (node.split != null) {
      node = features[node.split.fi] <= node.split.th ? node.left : node.right;
    }
    return node.value;
  };
}

function predictLogReturn(prices, extras, rnd) {
  const data = buildFeatures(prices, extras);
  if (data.length < 12) return null;

  const TREES = 12;
  const preds = [];
  const lastX = featuresAt(prices, prices.length - 1, extras);

  for (let t = 0; t < TREES; t++) {
    const sample = [];
    for (let i = 0; i < data.length; i++) {
      sample.push(data[Math.floor(rnd() * data.length)]);
    }
    const predict = trainTree(sample, 4, rnd);
    preds.push(predict(lastX));
  }

  return mean(preds);
}

export function randomForestPredict(
  prices,
  { sentiment = 0, volatility = 0, geoImpact = 0 } = {},
  daysAhead = 1
) {
  const clean = (prices || []).map(Number).filter((p) => Number.isFinite(p) && p > 0);
  if (clean.length < 18) return null;

  const extras = { sentiment, volatility, geoImpact };
  const rnd = seededRandom(seriesSeed(clean));
  const forecasts = [];
  let rolling = [...clean];

  for (let k = 1; k <= daysAhead; k++) {
    const predLogRet = predictLogReturn(rolling, extras, rnd);
    if (predLogRet == null || !Number.isFinite(predLogRet)) return null;

    const last = rolling[rolling.length - 1];
    const nextPrice = last * Math.exp(predLogRet);
    forecasts.push({ dayOffset: k, price: Number(nextPrice.toFixed(6)) });
    rolling = [...rolling, nextPrice];
  }

  return {
    nextPrice: forecasts[0]?.price ?? null,
    forecasts,
    trees: 12,
    target: 'log_return',
  };
}
