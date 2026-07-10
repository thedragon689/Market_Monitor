function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/** Anomalie su rendimenti giornalieri (z-score). */
export function detectPriceAnomalies(series, { zThreshold = 2.5, window = 60 } = {}) {
  if (!series?.length || series.length < 10) return [];

  const prices = series.map((p) => Number(p.price)).filter(Number.isFinite);
  const returns = [];
  for (let i = 1; i < prices.length; i += 1) {
    returns.push({ i, date: series[i].date ?? series[i].time, ret: (prices[i] - prices[i - 1]) / prices[i - 1] });
  }

  const slice = returns.slice(-window);
  const m = mean(slice.map((r) => r.ret));
  const s = std(slice.map((r) => r.ret)) || 1e-9;

  return slice
    .map((r) => {
      const z = (r.ret - m) / s;
      return {
        date: r.date,
        returnPct: Number((r.ret * 100).toFixed(2)),
        zScore: Number(z.toFixed(2)),
        price: prices[r.i],
        severity: Math.abs(z) >= zThreshold * 1.5 ? 'high' : 'medium',
        type: z > 0 ? 'spike_up' : 'spike_down',
      };
    })
    .filter((a) => Math.abs(a.zScore) >= zThreshold)
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
    .slice(0, 12);
}

/** Anomalie P/L portfolio — posizioni con movimento estremo vs soglia alert. */
export function detectPortfolioAnomalies(positions) {
  if (!positions?.length) return [];
  return positions
    .filter((p) => p.plPercent != null && Math.abs(p.plPercent) >= 8)
    .map((p) => ({
      symbol: p.symbol,
      plPercent: Number(p.plPercent.toFixed(2)),
      type: p.plPercent >= 15 ? 'gain_spike' : p.plPercent <= -15 ? 'loss_spike' : p.plPercent > 0 ? 'gain' : 'loss',
      message:
        p.plPercent >= 15
          ? `Guadagno eccezionale (+${p.plPercent.toFixed(1)}%)`
          : p.plPercent <= -15
            ? `Perdita marcata (${p.plPercent.toFixed(1)}%)`
            : `Movimento rilevante (${p.plPercent.toFixed(1)}%)`,
    }))
    .sort((a, b) => Math.abs(b.plPercent) - Math.abs(a.plPercent));
}
