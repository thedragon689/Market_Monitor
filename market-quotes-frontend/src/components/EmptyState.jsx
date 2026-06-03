export default function EmptyState({
  icon = '◇',
  title,
  message,
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden>
        {icon}
      </span>
      {title && <h4 className="empty-state__title">{title}</h4>}
      <p className="empty-state__message">{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
