import { useEffect } from 'react';
import BottomNavIcon from './BottomNavIcon';
import { SearchIcon } from './icons/HeaderIcons';

const ACTIONS = [
  {
    id: 'markets',
    label: 'Cerca mercati',
    hint: 'Titoli, crypto, indici e materie prime',
    icon: 'search',
  },
  {
    id: 'info',
    label: 'Info & fonti dati',
    hint: 'Disclaimer, provider e trasparenza tecnica',
    icon: 'info',
  },
  {
    id: 'favorites',
    label: 'Preferiti',
    hint: 'Asset salvati nella watchlist',
    icon: 'favorites',
  },
];

export default function MobileSearchMenu({ open, onClose, onSelect }) {
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
    <div className="mobile-search-menu" role="presentation">
      <button
        type="button"
        className="mobile-search-menu__backdrop"
        aria-label="Chiudi"
        onClick={onClose}
      />
      <div
        className="mobile-search-menu__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-search-menu-title"
      >
        <header className="mobile-search-menu__head">
          <span className="mobile-search-menu__head-icon" aria-hidden>
            <SearchIcon size={20} />
          </span>
          <div>
            <h2 id="mobile-search-menu-title" className="mobile-search-menu__title">
              Dove vuoi andare?
            </h2>
            <p className="mobile-search-menu__lead">Scegli una destinazione</p>
          </div>
          <button
            type="button"
            className="mobile-search-menu__close"
            onClick={onClose}
            aria-label="Chiudi"
          >
            ✕
          </button>
        </header>
        <ul className="mobile-search-menu__list">
          {ACTIONS.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                className="mobile-search-menu__option"
                onClick={() => {
                  onSelect?.(action.id);
                  onClose?.();
                }}
              >
                <span className="mobile-search-menu__option-icon" aria-hidden>
                  {action.icon === 'search' ? (
                    <SearchIcon size={20} />
                  ) : (
                    <BottomNavIcon id={action.icon} active />
                  )}
                </span>
                <span className="mobile-search-menu__option-text">
                  <strong>{action.label}</strong>
                  <small>{action.hint}</small>
                </span>
                <span className="mobile-search-menu__option-arrow" aria-hidden>
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
