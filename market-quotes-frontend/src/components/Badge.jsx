/** Badge riutilizzabile per variazioni e stati. */
export default function Badge({
  children,
  tone = 'neutral',
  size = 'md',
  className = '',
}) {
  return (
    <span
      className={`ui-badge ui-badge--${tone} ui-badge--${size} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
