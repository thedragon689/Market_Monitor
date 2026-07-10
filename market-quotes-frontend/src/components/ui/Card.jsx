/** Card del design system. Supporta glass, hover e slot header/body/footer. */
export function Card({
  as: Tag = 'div',
  glass = false,
  hover = false,
  padded = false,
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'ui-card',
    glass && 'ui-card--glass',
    hover && 'ui-card--hover',
    padded && 'ui-card--pad',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, actions, className = '', children }) {
  return (
    <div className={`ui-card__header ${className}`.trim()}>
      {title ? <h3 className="ui-card__title">{title}</h3> : children}
      {actions ? <div className="ui-card__actions">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className = '', children }) {
  return <div className={`ui-card__body ${className}`.trim()}>{children}</div>;
}

export function CardFooter({ className = '', children }) {
  return <div className={`ui-card__footer ${className}`.trim()}>{children}</div>;
}

export default Card;
