import { MARKET_CATEGORIES } from '../data/categories';
import CategoryIcon from './icons/CategoryIcon';
import Sparkline from './Sparkline';
import { changeTone, formatChangeBadge, formatCurrentPrice } from '../utils/catalogPrice';

const STRIP_IDS = ['index', 'crypto', 'commodity', 'forex'];

function topAsset(catalog, typeId) {
  const items = catalog?.[typeId] || [];
  return items.find((i) => i.quote?.price) ?? items[0] ?? null;
}

function sparkPointsFromQuote(quote) {
  if (!quote?.price) return [];
  const price = Number(quote.price);
  const pct = Number(quote.changePercent) || 0;
  return Array.from({ length: 5 }, (_, i) => ({
    price: price * (1 + (pct / 100) * (i / 4 - 0.5)),
  }));
}

/** Panoramica compatta 2×2 — stile eToro Discover, solo mobile explore. */
export default function MobileOverviewStrip({
  catalog,
  loading,
  fx,
  activeType,
  onSelectCategory,
  onSelectAsset,
}) {
  const categories = MARKET_CATEGORIES.filter((c) => STRIP_IDS.includes(c.id));

  if (loading && !catalog) {
    return (
      <div className="mobile-overview-strip mobile-overview-strip--loading">
        <div className="skeleton skeleton--block" />
      </div>
    );
  }

  return (
    <section className="mobile-overview-strip" aria-label="Mercati principali">
      <div className="mobile-overview-strip__grid">
        {categories.map((cat) => {
          const asset = topAsset(catalog, cat.id);
          const price = asset ? formatCurrentPrice(asset.quote, asset, fx) : null;
          const chg = asset ? formatChangeBadge(asset.quote) : null;
          const tone = changeTone(asset?.quote?.changePercent);

          return (
            <article
              key={cat.id}
              className={`mobile-overview-strip__card ${activeType === cat.id ? 'is-active' : ''}`}
            >
              <button
                type="button"
                className="mobile-overview-strip__head"
                onClick={() => onSelectCategory?.(cat.id)}
              >
                <span className="mobile-overview-strip__icon" aria-hidden>
                  <CategoryIcon id={cat.id} size={20} />
                </span>
                <span className="mobile-overview-strip__label">{cat.label}</span>
              </button>
              {asset ? (
                <button
                  type="button"
                  className="mobile-overview-strip__asset"
                  onClick={() => onSelectAsset?.(asset.id, cat.id)}
                >
                  <code>{asset.id}</code>
                  <span className="mobile-overview-strip__price">{price?.primary ?? '—'}</span>
                  {chg != null && (
                    <span className={`mobile-overview-strip__chg mobile-overview-strip__chg--${tone}`}>
                      {chg}
                    </span>
                  )}
                  <Sparkline
                    points={sparkPointsFromQuote(asset.quote)}
                    tone={tone === 'neutral' ? 'auto' : tone}
                    width={56}
                    height={22}
                  />
                </button>
              ) : (
                <p className="mobile-overview-strip__empty">—</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
