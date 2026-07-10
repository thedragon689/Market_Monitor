/** Skeleton loader con shimmer. Usare per placeholder dei widget dati. */
export default function Skeleton({
  width,
  height,
  circle = false,
  className = '',
  style,
  ...rest
}) {
  const cls = [
    'ui-skeleton',
    circle && 'ui-skeleton--circle',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={cls}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...rest}
    />
  );
}

/** Blocco di più righe testo skeleton. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <span className={`ui-skeleton-group ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className="ui-skeleton ui-skeleton--text"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </span>
  );
}
