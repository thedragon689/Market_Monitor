/** Badge del design system: stati e variazioni (up/down/info/warning/accent). */
export default function Badge({
  tone = 'neutral',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'ui-badge',
    `ui-badge--${tone}`,
    size !== 'md' && `ui-badge--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}
