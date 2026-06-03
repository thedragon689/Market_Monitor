/** Modelli di previsione (toolkit Yahoo §5). */

export function linearForecast(prices, daysAhead = 5) {
  const n = prices?.length ?? 0;
  if (n < 2) return null;

  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const ys = prices;

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const forecasts = [];
  for (let i = 1; i <= daysAhead; i++) {
    forecasts.push({
      dayOffset: i,
      dayIndex: n + i,
      price: slope * (n + i) + intercept,
    });
  }

  return { slope, intercept, forecasts };
}

export function logReturnForecast(prices, daysAhead = 1) {
  if (!prices?.length || prices.length < 2) return null;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const r = Math.log(prices[i] / prices[i - 1]);
    if (Number.isFinite(r)) returns.push(r);
  }
  if (!returns.length) return null;

  const avgR = returns.reduce((a, b) => a + b, 0) / returns.length;
  const last = prices[prices.length - 1];

  const forecasts = [];
  let price = last;
  for (let i = 1; i <= daysAhead; i++) {
    price *= Math.exp(avgR);
    forecasts.push({ dayOffset: i, dayIndex: prices.length + i, price });
  }

  return {
    avgLogReturn: avgR,
    lastPrice: last,
    nextPrice: forecasts[0]?.price ?? null,
    forecasts,
  };
}

/** Media mobile semplice come previsione flat (compat API esistente). */
export function smaForecast(prices, windowSize, horizonDays) {
  const level = smaLevel(prices, windowSize);
  if (level == null) return null;

  return {
    window: windowSize,
    level,
    forecasts: Array.from({ length: horizonDays }, (_, i) => ({
      dayOffset: i + 1,
      dayIndex: prices.length + i + 1,
      price: level,
    })),
  };
}

function smaLevel(prices, windowSize) {
  if (prices.length < windowSize) return null;
  const slice = prices.slice(-windowSize);
  return slice.reduce((acc, p) => acc + p, 0) / windowSize;
}
