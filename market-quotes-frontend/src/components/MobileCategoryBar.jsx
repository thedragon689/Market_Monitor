import { MARKET_CATEGORIES } from '../data/categories';

const PRIMARY = MARKET_CATEGORIES.filter((c) => c.group === 'primary');

export default function MobileCategoryBar({ type, onTypeChange, summary }) {
  const summaryKeys = {
    stock: 'stocks',
    national: 'national',
    index: 'indices',
    forex: 'forex',
    crypto: 'crypto',
    precious: 'precious',
    commodity: 'commodities',
    etf: 'etf',
  };

  return (
    <nav className="mobile-cat-bar" aria-label="Categorie mercato">
      <ul className="mobile-cat-bar__list">
        {PRIMARY.map((cat) => {
          const stat = summary?.[summaryKeys[cat.id]];
          const active = type === cat.id;
          return (
            <li key={cat.id}>
              <button
                type="button"
                className={`mobile-cat-bar__btn ${active ? 'is-active' : ''}`}
                onClick={() => onTypeChange?.(cat.id)}
                aria-current={active ? 'true' : undefined}
              >
                <span className="mobile-cat-bar__icon" aria-hidden>
                  {cat.icon}
                </span>
                <span className="mobile-cat-bar__label">{cat.label}</span>
                {stat?.quoted != null && (
                  <span className="mobile-cat-bar__count">{stat.quoted}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
