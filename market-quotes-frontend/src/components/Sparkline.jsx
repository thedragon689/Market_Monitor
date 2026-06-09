import { useMemo } from 'react';

/** Mini sparkline SVG da serie prezzi (ultimi N punti). */
export default function Sparkline({
  points = [],
  width = 72,
  height = 28,
  className = '',
  tone = 'auto',
}) {
  const path = useMemo(() => {
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
      return `${x},${y}`;
    });

    return `M ${coords.join(' L ')}`;
  }, [points, width, height]);

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

  return (
    <svg
      className={`sparkline sparkline--${resolvedTone} ${className}`.trim()}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
