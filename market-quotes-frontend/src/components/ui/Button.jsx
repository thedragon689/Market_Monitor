/** Button del design system con varianti e dimensioni. */
export default function Button({
  variant = 'outline',
  size = 'md',
  block = false,
  icon = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'ui-btn',
    `ui-btn--${variant}`,
    size !== 'md' && `ui-btn--${size}`,
    icon && 'ui-btn--icon',
    block && 'ui-btn--block',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
