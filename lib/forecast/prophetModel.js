/**
 * Previsione stagionale leggera (stile Prophet) — trend + stagionalità su indice temporale.
 */

function cleanPrices(prices) {
  return (prices || []).map(Number).filter((p) => Number.isFinite(p) && p > 0);
}

function linearTrend(y) {
  const n = y.length;
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * y[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (!denom) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function prophetForecast(prices, horizonDays = 5) {
  const data = cleanPrices(prices);
  if (data.length < 30) return null;

  const n = data.length;
  const { slope, intercept } = linearTrend(data);
  const detrended = data.map((p, i) => p - (slope * (i + 1) + intercept));

  const seasonal = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (let i = 0; i < n; i++) {
    const dow = i % 7;
    seasonal[dow] += detrended[i];
    counts[dow] += 1;
  }
  for (let d = 0; d < 7; d++) {
    if (counts[d]) seasonal[d] /= counts[d];
  }

  const forecasts = [];
  for (let h = 1; h <= horizonDays; h++) {
    const t = n + h;
    const dow = (n + h - 1) % 7;
    const price = slope * t + intercept + seasonal[dow];
    forecasts.push({
      dayOffset: h,
      dayIndex: n + h,
      price: Number(Math.max(price, 1e-8).toFixed(6)),
    });
  }

  return {
    nextPrice: forecasts[0]?.price ?? null,
    forecasts,
    components: {
      slope: Number(slope.toFixed(6)),
      intercept: Number(intercept.toFixed(4)),
      seasonalAmplitude: Number(
        (Math.max(...seasonal) - Math.min(...seasonal)).toFixed(4)
      ),
    },
    formula: 'Prophet-lite (trend + stagionalità 7gg)',
  };
}
