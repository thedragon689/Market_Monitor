/**
 * Suggerimenti rebalancing verso pesi target (equal-weight o custom).
 */
export function suggestRebalance(positions, { targetWeights, mode = 'equal' } = {}) {
  if (!positions?.length) return { suggestions: [], mode };

  const total = positions.reduce((s, p) => s + (p.currentValueBase ?? p.currentValue ?? 0), 0);
  if (!total || total <= 0) {
    return { suggestions: [], mode, error: 'Valore portfolio non disponibile' };
  }

  let weights = targetWeights;
  if (!weights || mode === 'equal') {
    const w = 1 / positions.length;
    weights = Object.fromEntries(positions.map((p) => [p.symbol, w]));
  }

  const suggestions = positions.map((p) => {
    const current = (p.currentValueBase ?? p.currentValue ?? 0) / total;
    const target = weights[p.symbol] ?? 0;
    const delta = target - current;
    const deltaValue = delta * total;
    const price = p.quote?.price ?? p.currentPrice;
    const qty = price > 0 ? deltaValue / price : null;

    return {
      symbol: p.symbol,
      currentWeightPct: Number((current * 100).toFixed(1)),
      targetWeightPct: Number((target * 100).toFixed(1)),
      deltaWeightPct: Number((delta * 100).toFixed(1)),
      action: delta > 0.02 ? 'buy' : delta < -0.02 ? 'sell' : 'hold',
      estimatedQty: qty != null ? Number(Math.abs(qty).toFixed(4)) : null,
      estimatedValue: Number(Math.abs(deltaValue).toFixed(2)),
    };
  });

  return {
    mode,
    totalValue: Number(total.toFixed(2)),
    suggestions: suggestions.filter((s) => s.action !== 'hold'),
  };
}
