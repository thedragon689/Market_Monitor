import { useMemo } from 'react';

/** Mini sparkline SVG da serie prezzi (ultimi N punti). */
export default function Sparkline({
  points = [],
  width = 72,
  height = 28,
  className = '',
  tone = 'auto',
  filled = false,
}) {
  const geometry = useMemo(() => {
    const vals = points
      .map((p) => (typeof p === 'number' ? p : p?.price))
      .filter((v) => v != null && Number.isFinite(Number(v)));
    if (vals.length < 2) return null;

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;

    const coords = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * w;
      const y = pad + h - ((v - min) / span) * h;
      return [x, y];
    });

    const line = `M ${coords.map(([x, y]) => `${x},${y}`).join(' L ')}`;
    const last = coords[coords.length - 1];
    const first = coords[0];
    const area = `${line} L ${last[0]},${height - pad} L ${first[0]},${height - pad} Z`;

    return { line, area, pad };
  }, [points, width, height]);

  const path = geometry?.line;

  if (!path) {
    return <span className={`sparkline sparkline--empty ${className}`.trim()} aria-hidden>—</span>;
  }

  const resolvedTone =
    tone === 'auto'
      ? Number(points[points.length - 1]?.price ?? points[points.length - 1]) >=
        Number(points[0]?.price ?? points[0])
        ? 'up'
        : 'down'
      : tone;

  const gradId = `spark-fill-${resolvedTone}-${width}-${height}`;

  return (
    <svg
      className={`sparkline sparkline--depth sparkline--${resolvedTone} ${filled ? 'sparkline--filled' : ''} ${className}`.trim()}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {filled && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      )}
      {filled && geometry?.area && (
        <path d={geometry.area} fill={`url(#${gradId})`} stroke="none" />
      )}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
