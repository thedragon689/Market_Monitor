/** Direzione del trend dalle ultime rilevazioni (sparkline). */
export function trendFromSpark(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const first = Number(points[0]?.price);
  const lastP = Number(points[points.length - 1]?.price);
  if (!Number.isFinite(first) || !Number.isFinite(lastP) || first <= 0) return null;
  const pct = (lastP / first - 1) * 100;
  if (pct > 0.5) return { arrow: '↗', label: 'in salita', pct };
  if (pct < -0.5) return { arrow: '↘', label: 'in discesa', pct };
  return { arrow: '→', label: 'laterale', pct };
}
