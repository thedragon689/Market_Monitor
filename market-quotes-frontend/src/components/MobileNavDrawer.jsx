import { useEffect, useRef } from 'react';
import { APP_VIEWS } from '../data/views';
import { PRO_NAV_ITEMS, isProNavActive } from '../data/proNav';
import { MARKET_CATEGORIES } from '../data/categories';

const PRIMARY_CATEGORIES = MARKET_CATEGORIES.filter((c) => c.group === 'primary');

const DRAWER_CTAS = [
  { id: 'search', label: 'Cerca', action: 'openSearch' },
  { id: 'markets', label: 'Mercati', action: 'markets' },
  { id: 'info', label: 'Info', action: 'info' },
  { id: 'favorites', label: 'Preferiti', action: 'favorites' },
];

export default function MobileNavDrawer({
  open,
  onClose,
  view,
  type,
  onViewChange,
  onTypeChange,
  onQuickNav,
  onOpenSearchMenu,
  onQuickAction,
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

  const handleProNav = (item) => {
    if (onQuickNav) {
      onQuickNav({ id: item.id, view: item.view, type: item.type });
    } else {
      if (item.type && item.type !== type) onTypeChange?.(item.type);
      if (item.view === 'forecast') onViewChange?.('forecast');
      else if (item.view) onViewChange?.(item.view);
    }
    onClose?.();
  };

  const handleWorkflowNav = (stepId) => {
    if (onQuickNav) {
      onQuickNav({ view: stepId });
    } else if (stepId === 'forecast') {
      onViewChange?.('forecast');
    } else {
      onViewChange?.(stepId);
    }
    onClose?.();
  };

  const handleCategoryNav = (catId) => {
    if (onQuickNav) {
      onQuickNav({ view: 'explore', type: catId });
    } else {
      onTypeChange?.(catId);
      onViewChange?.('explore');
    }
    onClose?.();
  };

  const handleDrawerCta = (action) => {
    if (action === 'openSearch') {
      onOpenSearchMenu?.();
      onClose?.();
      return;
    }
    onQuickAction?.(action);
    onClose?.();
  };

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

        <div className="mobile-drawer__cta-row" role="group" aria-label="Azioni rapide">
          {DRAWER_CTAS.map((cta) => (
            <button
              key={cta.id}
              type="button"
              className="mobile-drawer__cta"
              onClick={() => handleDrawerCta(cta.action)}
            >
              {cta.label}
            </button>
          ))}
        </div>

        <nav className="mobile-drawer__section" aria-label="Navigazione principale">
          <p className="mobile-drawer__label">Mercati</p>
          <ul className="mobile-drawer__list">
            {PRO_NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`mobile-drawer__btn ${isProNavActive(item, view, type) ? 'is-active' : ''}`}
                  onClick={() => handleProNav(item)}
                >
                  <span>
                    <strong>{item.label}</strong>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="mobile-drawer__section" aria-label="Passaggi">
          <p className="mobile-drawer__label">Passaggi</p>
          <ul className="mobile-drawer__list">
            {APP_VIEWS.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  className={`mobile-drawer__btn ${view === v.id ? 'is-active' : ''}`}
                  onClick={() => handleWorkflowNav(v.id)}
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
                    handleCategoryNav(cat.id);
                    onClose?.();
                  }}
                >
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
