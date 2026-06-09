import {
  CATEGORY_GROUPS,
  INTERNAL_SECTIONS,
  categoriesByGroup,
  categoryCount,
} from '../data/categories';
import CategoryIcon from './icons/CategoryIcon';

function CategoryCard({ cat, active, count, variant, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`category-card category-card--${cat.tone} ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="category-card__icon" aria-hidden>
        <CategoryIcon id={cat.id} />
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
}

export default function CategorySelector({
  type,
  onTypeChange,
  summary,
  variant = 'cards',
  sticky = false,
  onInternalSection,
}) {
  return (
    <nav
      className={`category-selector category-selector--${variant} ${sticky ? 'category-selector--sticky' : ''}`}
      role="tablist"
      aria-label="Categorie di mercato"
    >
      {variant === 'bar' && (
        <p className="category-selector__intro">
          <strong>Scegli mercato</strong>
          <span>Indici, forex, ETF, crypto, macro e altro</span>
        </p>
      )}

      {CATEGORY_GROUPS.filter((g) => g.id !== 'internal').map((group) => (
        <section key={group.id} className="category-selector__group">
          <h3 className="category-selector__group-title">{group.label}</h3>
          <div className="category-selector__grid">
            {categoriesByGroup(group.id).map((cat) => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                active={type === cat.id}
                count={categoryCount(summary, cat.id)}
                variant={variant}
                onClick={() => onTypeChange(cat.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {onInternalSection && (
        <section className="category-selector__group category-selector__group--internal">
          <h3 className="category-selector__group-title">
            {CATEGORY_GROUPS.find((g) => g.id === 'internal')?.label}
          </h3>
          <div className="category-selector__grid category-selector__grid--internal">
            {INTERNAL_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className="category-card category-card--internal"
                onClick={() => onInternalSection(section)}
              >
                <span className="category-card__icon" aria-hidden>
                  <CategoryIcon id={section.id} />
                </span>
                <span className="category-card__body">
                  <span className="category-card__label">{section.label}</span>
                  <span className="category-card__headline">{section.headline}</span>
                  {variant !== 'compact' && (
                    <span className="category-card__desc">{section.description}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </nav>
  );
}
