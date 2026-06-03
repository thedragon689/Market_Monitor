/** Volatilità storica (rendimenti giornalieri). */

export function computeVolatility(prices, window = 20) {
  if (!prices?.length || prices.length < 3) {
    return { daily: 0, annualized: 0, window: 0 };
  }

  const w = Math.min(window, prices.length - 1);
  const returns = [];
  for (let i = prices.length - w; i < prices.length; i++) {
    const prev = prices[i - 1];
    if (prev > 0) returns.push((prices[i] - prev) / prev);
  }

  if (!returns.length) return { daily: 0, annualized: 0, window: w };

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / returns.length;
  const daily = Math.sqrt(variance);

  return {
    daily: Number(daily.toFixed(5)),
    annualized: Number((daily * Math.sqrt(252)).toFixed(4)),
    window: w,
  };
}

/** Aggiustamento volatilità: alta vol → attenua deviazione dalla quotazione corrente. */
export function volatilityAdjustment(lastPrice, forecastPrice, volDaily) {
  if (lastPrice == null || forecastPrice == null) return forecastPrice;
  const damp = Math.min(0.45, volDaily * 8);
  return lastPrice + (forecastPrice - lastPrice) * (1 - damp);
}
