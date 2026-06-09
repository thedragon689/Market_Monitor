/**
 * Volatilità storica annualizzata da rendimenti log giornalieri.
 */
export function historicalVolatility(prices, window = 30) {
  const data = (prices || []).map(Number).filter((p) => Number.isFinite(p) && p > 0);
  if (data.length < window + 1) return null;

  const slice = data.slice(-(window + 1));
  const rets = [];
  for (let i = 1; i < slice.length; i++) {
    rets.push(Math.log(slice[i] / slice[i - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
  const daily = Math.sqrt(variance);
  const annualized = daily * Math.sqrt(252);

  return {
    window,
    daily: Number((daily * 100).toFixed(3)),
    annualized: Number((annualized * 100).toFixed(2)),
    label: `${window}gg annualizzata`,
  };
}
