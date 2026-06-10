import { PRO_NAV_ITEMS, isProNavActive } from '../data/proNav';

export default function ProNavbar({ view, type, onNavigate }) {
  return (
    <nav className="pro-nav" aria-label="Navigazione principale">
      <div className="pro-nav__inner">
        <ul className="pro-nav__list">
          {PRO_NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`pro-nav__link ${isProNavActive(item, view, type) ? 'is-active' : ''}`}
                onClick={() =>
                  onNavigate?.({
                    id: item.id,
                    view: item.view,
                    type: item.type,
                  })
                }
                aria-current={isProNavActive(item, view, type) ? 'page' : undefined}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
