import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Bottom-sheet mobile: slide-up con grabber, chiusura via ESC / click esterno. */
export default function BottomSheet({ open, onClose, title, children }) {
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
      className="ui-sheet__overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="ui-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ui-sheet__grabber" aria-hidden="true" />
        {title ? <h2 className="ui-sheet__title">{title}</h2> : null}
        {children}
      </div>
    </div>,
    document.body
  );
}
