import { useEffect, useRef } from 'react';
import { APP_VIEWS } from '../data/views';
import { MARKET_CATEGORIES } from '../data/categories';

const PRIMARY_CATEGORIES = MARKET_CATEGORIES.filter((c) => c.group === 'primary');

export default function MobileNavDrawer({
  open,
  onClose,
  view,
  type,
  onViewChange,
  onTypeChange,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mobile-drawer" role="presentation">
      <button
        type="button"
        className="mobile-drawer__backdrop"
        aria-label="Chiudi menu"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="mobile-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigazione"
      >
        <header className="mobile-drawer__head">
          <strong>Menu</strong>
          <button type="button" className="mobile-drawer__close" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </header>

        <nav className="mobile-drawer__section" aria-label="Passaggi">
          <p className="mobile-drawer__label">Passaggi</p>
          <ul className="mobile-drawer__list">
            {APP_VIEWS.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  className={`mobile-drawer__btn ${view === v.id ? 'is-active' : ''}`}
                  onClick={() => {
                    onViewChange?.(v.id);
                    onClose?.();
                  }}
                >
                  <span className="mobile-drawer__step">{v.step}</span>
                  <span>
                    <strong>{v.label}</strong>
                    <small>{v.hint}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="mobile-drawer__section" aria-label="Categorie mercato">
          <p className="mobile-drawer__label">Categorie</p>
          <ul className="mobile-drawer__chips">
            {PRIMARY_CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  className={`mobile-drawer__chip ${type === cat.id ? 'is-active' : ''}`}
                  onClick={() => {
                    onTypeChange?.(cat.id);
                    onClose?.();
                  }}
                >
                  <span aria-hidden>{cat.icon}</span> {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
