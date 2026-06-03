/**
 * Random Forest leggero (JS puro): alberi con split su feature casuali.
 * Feature: rendimenti lag, SMA ratio, RSI proxy, sentiment, vol.
 */

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function buildFeatures(prices, extras = {}) {
  const n = prices.length;
  const f = [];
  for (let i = 5; i < n; i++) {
    const ret1 = (prices[i] - prices[i - 1]) / prices[i - 1];
    const ret5 = (prices[i] - prices[i - 5]) / prices[i - 5];
    const sma5 = prices.slice(i - 4, i + 1).reduce((a, b) => a + b, 0) / 5;
    const smaRatio = prices[i] / sma5 - 1;
    f.push({
      y: prices[i],
      x: [
        ret1,
        ret5,
        smaRatio,
        extras.sentiment ?? 0,
        extras.volatility ?? 0,
        extras.geoImpact ?? 0,
      ],
    });
  }
  return f;
}

function trainTree(data, maxDepth = 4) {
  function build(subset, depth) {
    const ys = subset.map((r) => r.y);
    const value = mean(ys);
    if (depth >= maxDepth || subset.length < 6) return { value };

    const fi = Math.floor(Math.random() * subset[0].x.length);
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

export function randomForestPredict(prices, { sentiment = 0, volatility = 0, geoImpact = 0 }, daysAhead = 1) {
  const data = buildFeatures(prices, { sentiment, volatility, geoImpact });
  if (data.length < 12) return null;

  const TREES = 12;
  const preds = [];
  const lastX = data[data.length - 1].x;

  for (let t = 0; t < TREES; t++) {
    const sample = [];
    for (let i = 0; i < data.length; i++) {
      sample.push(data[Math.floor(Math.random() * data.length)]);
    }
    const predict = trainTree(sample);
    preds.push(predict(lastX));
  }

  const nextPrice = mean(preds);
  const forecasts = [];
  let p = prices[prices.length - 1];
  for (let k = 1; k <= daysAhead; k++) {
    const blend = p * 0.3 + nextPrice * 0.7;
    forecasts.push({ dayOffset: k, price: blend });
    p = blend;
  }

  return {
    nextPrice: Number(nextPrice.toFixed(4)),
    forecasts,
    trees: TREES,
  };
}
