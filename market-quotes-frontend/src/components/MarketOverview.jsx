import { MARKET_CATEGORIES } from '../data/categories';
import CategoryIcon from './icons/CategoryIcon';
import Sparkline from './Sparkline';
import { changeTone, formatChangeBadge, formatCurrentPrice } from '../utils/catalogPrice';

function sparkPointsFromQuote(quote) {
  if (!quote?.price) return [];
  const price = Number(quote.price);
  const pct = Number(quote.changePercent) || 0;
  const n = 6;
  return Array.from({ length: n }, (_, i) => ({
    price: price * (1 + (pct / 100) * (i / (n - 1) - 0.5)),
  }));
}

/** Homepage mobile-first: 4 macro-mercati principali. */
const OVERVIEW_IDS = ['index', 'crypto', 'commodity', 'forex'];

const CATALOG_KEYS = {
  stock: 'stocks',
  national: 'national',
  crypto: 'crypto',
  precious: 'precious',
  commodity: 'commodities',
  index: 'indices',
  forex: 'forex',
  etf: 'etf',
  volatility: 'volatility',
  rates: 'rates',
  macro: 'macro',
  sentiment: 'sentiment',
};

function topAssets(catalog, typeId, limit = 4) {
  const items = catalog?.[typeId] || [];
  return items
    .filter((i) => i.quote?.price)
    .slice(0, limit);
}

export default function MarketOverview({
  catalog,
  summary,
  loading,
  onSelectCategory,
  onSelectAsset,
  fx,
}) {
  const categories = MARKET_CATEGORIES.filter((c) => OVERVIEW_IDS.includes(c.id));

  if (loading && !catalog) {
    return (
      <section className="market-overview app-card">
        <div className="market-overview__skeleton skeleton skeleton--block" />
      </section>
    );
  }

  return (
    <section className="market-overview app-card" aria-label="Panoramica mercati">
      <header className="market-overview__head">
        <div>
          <h2 className="market-overview__title">Panoramica mercati</h2>
          <p className="market-overview__lead">
            Scegli una categoria per esplorare asset, quotazioni e analisi.
          </p>
        </div>
        {summary && (
          <p className="market-overview__meta">
            {Object.values(summary).reduce((n, s) => n + (s?.quoted ?? 0), 0)} asset con prezzo live
          </p>
        )}
      </header>

      <div className="market-overview__grid">
        {categories.map((cat) => {
          const assets = topAssets(catalog, cat.id);
          const statKey = CATALOG_KEYS[cat.id];
          const stat = summary?.[statKey];

          return (
            <article key={cat.id} className={`market-overview__card market-overview__card--${cat.tone}`}>
              <button
                type="button"
                className="market-overview__card-head"
                onClick={() => onSelectCategory?.(cat.id)}
              >
                <span className="market-overview__icon" aria-hidden>
                  <CategoryIcon id={cat.id} />
                </span>
                <div>
                  <h3 className="market-overview__card-title">{cat.label}</h3>
                  <p className="market-overview__card-desc">{cat.description}</p>
                </div>
                {stat && (
                  <span className="market-overview__count">
                    {stat.quoted ?? 0}/{stat.total ?? '—'}
                  </span>
                )}
              </button>

              <ul className="market-overview__assets">
                {assets.length ? (
                  assets.map((item) => {
                    const price = formatCurrentPrice(item.quote, item, fx);
                    const tone = changeTone(item.quote?.changePercent);
                    const chg = formatChangeBadge(item.quote);

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="market-overview__asset"
                          onClick={() => onSelectAsset?.(item.id, cat.id)}
                        >
                          <span className="market-overview__asset-main">
                            <code>{item.id}</code>
                            <span>{item.name}</span>
                          </span>
                          <Sparkline
                            className="market-overview__asset-spark"
                            points={sparkPointsFromQuote(item.quote)}
                            tone={tone === 'neutral' ? 'auto' : tone}
                            width={64}
                            height={24}
                          />
                          <span className="market-overview__asset-quote">
                            <strong>{price.primary}</strong>
                            {chg != null && (
                              <span className={`market-overview__chg market-overview__chg--${tone}`}>
                                {chg}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })
                ) : (
                  <li className="market-overview__empty">Caricamento quotazioni…</li>
                )}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
