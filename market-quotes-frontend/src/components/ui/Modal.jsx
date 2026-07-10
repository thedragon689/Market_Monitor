import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Modal centrato con overlay, chiusura via ESC / click esterno / bottone. */
export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="ui-modal__overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="ui-modal" role="dialog" aria-modal="true" aria-label={title}>
        {(title || onClose) && (
          <div className="ui-modal__header">
            {title ? <h2 className="ui-modal__title">{title}</h2> : <span />}
            {onClose && (
              <button
                type="button"
                className="ui-modal__close"
                onClick={onClose}
                aria-label="Chiudi"
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer ? <div className="ui-card__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
