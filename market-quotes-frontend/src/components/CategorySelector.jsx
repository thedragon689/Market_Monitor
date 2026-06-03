import { MARKET_CATEGORIES, categoryCount } from '../data/categories';

export default function CategorySelector({
  type,
  onTypeChange,
  summary,
  variant = 'cards',
  sticky = false,
}) {
  return (
    <nav
      className={`category-selector category-selector--${variant} ${sticky ? 'category-selector--sticky' : ''}`}
      role="tablist"
      aria-label="Categoria di mercato"
    >
      {variant === 'bar' && (
        <p className="category-selector__intro">
          <strong>Scegli mercato</strong>
          <span>Azioni, crypto, metalli e materie prime</span>
        </p>
      )}

      <div className="category-selector__grid">
        {MARKET_CATEGORIES.map((cat) => {
          const active = type === cat.id;
          const count = categoryCount(summary, cat.id);

          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`category-card category-card--${cat.tone} ${active ? 'is-active' : ''}`}
              onClick={() => onTypeChange(cat.id)}
            >
              <span className="category-card__icon" aria-hidden>
                {cat.id === 'stock'
                  ? '◆'
                  : cat.id === 'national'
                    ? '◇'
                    : cat.id === 'crypto'
                      ? '₿'
                      : cat.id === 'precious'
                        ? '●'
                        : '▲'}
              </span>
              <span className="category-card__body">
                <span className="category-card__label">{cat.label}</span>
                <span className="category-card__headline">{cat.headline}</span>
                {variant !== 'compact' && (
                  <span className="category-card__desc">{cat.description}</span>
                )}
                <span className="category-card__meta">
                  {count != null && (
                    <span className="category-card__count">{count} asset</span>
                  )}
                  <span className="category-card__unit">{cat.unit}</span>
                </span>
              </span>
              {active && <span className="category-card__check" aria-hidden>✓</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
