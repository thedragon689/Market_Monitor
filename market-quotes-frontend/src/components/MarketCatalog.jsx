import { useMemo, useState } from 'react';
import { MARKET_CATEGORIES } from '../data/categories';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { formatShortDate } from '../utils/format';
import { changeTone, formatChangeBadge, formatCurrentPrice } from '../utils/catalogPrice';
import { SORT_OPTIONS, sortAssetItems } from '../utils/sortAssets';

const STOCK_SUBGROUPS = [
  { id: 'US', title: 'Stati Uniti', match: (i) => i.market === 'US' || i.region === 'USA' },
  { id: 'EU', title: 'Europa', match: (i) => i.market === 'EU' || i.region === 'Europa' },
  { id: 'AF', title: 'Africa', match: (i) => i.market === 'AF' || i.region === 'Africa' },
];

const CATEGORY_SECTIONS = MARKET_CATEGORIES.map((cat) => ({
  id: cat.id,
  title: cat.label,
  subtitle: cat.description,
  tone: cat.tone,
  ...(cat.id === 'stock' ? { subgroups: STOCK_SUBGROUPS } : {}),
}));

const ASSET_TYPE_LABELS = Object.fromEntries(
  MARKET_CATEGORIES.map((c) => [c.id, c.label])
);

function CatalogCard({
  item,
  selected,
  onSelect,
  onForecast,
  fx,
  showCategory,
  forecastLoading,
  compact = false,
}) {
  const q = item.quote;
  const meta = item;
  const price = formatCurrentPrice(q, meta, fx);
  const tone = changeTone(q?.changePercent);
  const chg = formatChangeBadge(q);
  const categoryLabel = ASSET_TYPE_LABELS[item.assetType] ?? null;

  return (
    <article
      className={`catalog-card ${compact ? 'catalog-card--chip' : ''} ${selected ? 'is-selected' : ''} ${!q?.price ? 'is-muted' : ''}`}
    >
      <button type="button" className="catalog-card__body" onClick={() => onSelect?.(item)}>
      {compact ? (
        <>
          <div className="catalog-card__row">
            <code className="catalog-card__code">{item.id}</code>
            {chg != null ? (
              <span className={`catalog-card__chg catalog-card__chg--${tone}`}>{chg}</span>
            ) : (
              <span className="catalog-card__chg catalog-card__chg--neutral">—</span>
            )}
          </div>
          <h3 className="catalog-card__name">{item.name}</h3>
          <p className="catalog-card__price">
            {price.primary}
            {price.unit && q?.price ? ` ${price.unit}` : ''}
          </p>
          <p className="catalog-card__hint">{item.hint || item.sector}</p>
          {item.region && <span className="catalog-card__region">{item.region}</span>}
          {item.family && !item.region && (
            <span className="catalog-card__region">{item.family}</span>
          )}
        </>
      ) : (
        <>
          <div className="catalog-card__top">
            <code className="catalog-card__code">{item.id}</code>
            {showCategory && categoryLabel && (
              <span className="catalog-card__category">{categoryLabel}</span>
            )}
            {item.region && <span className="catalog-card__region">{item.region}</span>}
            {item.family && !item.region && (
              <span className="catalog-card__region">{item.family}</span>
            )}
          </div>
          <h3 className="catalog-card__name">{item.name}</h3>
          <p className="catalog-card__hint">{item.hint || item.sector}</p>
          <div className="catalog-card__price-block">
            <span className="catalog-card__price-label">Prezzo attuale</span>
            <p className="catalog-card__price">
              {price.primary}
              {price.unit && <span className="catalog-card__unit"> {price.unit}</span>}
            </p>
            {price.secondary && <p className="catalog-card__price-sub">{price.secondary}</p>}
          </div>
          <div className="catalog-card__footer">
            {chg != null ? (
              <span className={`catalog-card__chg catalog-card__chg--${tone}`}>{chg}</span>
            ) : (
              <span className="catalog-card__chg catalog-card__chg--neutral">—</span>
            )}
            {q?.asOf && <time className="catalog-card__date">{formatShortDate(q.asOf)}</time>}
          </div>
        </>
      )}
      </button>
      <button
        type="button"
        className="catalog-card__cta btn btn--cta btn--compact"
        disabled={forecastLoading}
        onClick={() => onForecast?.(item)}
      >
        {forecastLoading && selected ? 'Calcolo…' : 'Prevedi'}
      </button>
    </article>
  );
}

function CatalogGrid({
  items,
  selectedType,
  selectedSymbol,
  onSelectAsset,
  onForecast,
  fx,
  showCategory,
  forecastLoading,
  className = '',
}) {
  const compact = className.includes('market-catalog__grid--chip');
  if (!items.length) return null;
  return (
    <div className={`market-catalog__grid ${className}`.trim()}>
      {items.map((item) => (
        <CatalogCard
          key={`${item.assetType}-${item.id}`}
          item={item}
          fx={fx}
          showCategory={showCategory}
          compact={compact}
          forecastLoading={forecastLoading}
          selected={selectedSymbol === item.id && selectedType === item.assetType}
          onSelect={(it) => onSelectAsset?.(it.id, it.assetType)}
          onForecast={(it) => onForecast?.(it.id, it.assetType)}
        />
      ))}
    </div>
  );
}

function filterItems(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (i) =>
      i.id.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      (i.hint || '').toLowerCase().includes(q) ||
      (i.sector || '').toLowerCase().includes(q) ||
      (i.region || '').toLowerCase().includes(q)
  );
}

export default function MarketCatalog({
  catalog,
  summary,
  updatedAt,
  loading,
  selectedType,
  selectedSymbol,
  onSelectAsset,
  onForecast,
  fx,
  forecastLoading,
  showAllCategories = false,
}) {
  const isMobile = useMobileLayout();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [stockRegion, setStockRegion] = useState('all');

  const catalogByType = useMemo(() => {
    const map = {};
    for (const cat of MARKET_CATEGORIES) {
      map[cat.id] = (catalog?.[cat.id] || []).map((i) => ({
        ...i,
        assetType: cat.id,
      }));
    }
    return map;
  }, [catalog]);

  const sectionsToRender = useMemo(() => {
    const active = showAllCategories
      ? CATEGORY_SECTIONS
      : CATEGORY_SECTIONS.filter((s) => s.id === selectedType);
    return active
      .map((section) => {
        const raw = filterItems(catalogByType[section.id] || [], query);
        if (!raw.length) return null;

        if (section.subgroups) {
          const subgroups = section.subgroups
            .map((sg) => ({
              ...sg,
              items: sortAssetItems(raw.filter(sg.match), sortBy),
            }))
            .filter((sg) => sg.items.length > 0);
          if (!subgroups.length) return null;
          return { ...section, subgroups, items: null };
        }
        return { ...section, items: sortAssetItems(raw, sortBy), subgroups: null };
      })
      .filter(Boolean);
  }, [showAllCategories, selectedType, catalogByType, query, sortBy]);

  const totalVisible = useMemo(
    () =>
      sectionsToRender.reduce((acc, s) => {
        if (s.subgroups) {
          return acc + s.subgroups.reduce((a, sg) => a + sg.items.length, 0);
        }
        return acc + (s.items?.length ?? 0);
      }, 0),
    [sectionsToRender]
  );

  const summaryKeys = {
    stock: 'stocks',
    national: 'national',
    index: 'indices',
    forex: 'forex',
    crypto: 'crypto',
    precious: 'precious',
    commodity: 'commodities',
    etf: 'etf',
    volatility: 'volatility',
    rates: 'rates',
    macro: 'macro',
    sentiment: 'sentiment',
  };

  const quotedTotal = MARKET_CATEGORIES.reduce(
    (acc, cat) => acc + (summary?.[summaryKeys[cat.id]]?.quoted ?? 0),
    0
  );
  const assetTotal = MARKET_CATEGORIES.reduce(
    (acc, cat) => acc + (summary?.[summaryKeys[cat.id]]?.total ?? 0),
    0
  );

  const showCategoryBadge = showAllCategories;

  const gridClassName = isMobile
    ? ''
    : 'symbol-picker__grid market-catalog__grid--chip';

  return (
    <section className={`market-catalog ${!isMobile ? 'market-catalog--picker-style' : ''}`.trim()}>
      <div className="market-catalog__stats">
        <div className="market-catalog__stat">
          <span className="market-catalog__stat-value">{assetTotal}</span>
          <span className="market-catalog__stat-label">Asset monitorati</span>
        </div>
        <div className="market-catalog__stat">
          <span className="market-catalog__stat-value">{quotedTotal}</span>
          <span className="market-catalog__stat-label">Con prezzo attuale</span>
        </div>
        <div className="market-catalog__stat">
          <span className="market-catalog__stat-value">{summary?.stocks?.total ?? '—'}</span>
          <span className="market-catalog__stat-label">Azioni</span>
        </div>
        <div className="market-catalog__stat">
          <span className="market-catalog__stat-value">{summary?.national?.total ?? '—'}</span>
          <span className="market-catalog__stat-label">Nazionali</span>
        </div>
        <div className="market-catalog__stat">
          <span className="market-catalog__stat-value">{summary?.crypto?.total ?? '—'}</span>
          <span className="market-catalog__stat-label">Crypto</span>
        </div>
        <div className="market-catalog__stat">
          <span className="market-catalog__stat-value">{summary?.precious?.total ?? '—'}</span>
          <span className="market-catalog__stat-label">Metalli</span>
        </div>
        <div className="market-catalog__stat">
          <span className="market-catalog__stat-value">{summary?.commodities?.total ?? '—'}</span>
          <span className="market-catalog__stat-label">Materie prime</span>
        </div>
      </div>

      <div className="market-catalog__toolbar">
        <input
          type="search"
          className="market-catalog__search"
          placeholder="Cerca simbolo o nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="market-catalog__sort">
          <span>Ordina</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {updatedAt && (
        <p className="market-catalog__updated">
          Quotazioni aggiornate · {new Date(updatedAt).toLocaleString('it-IT')}
          {loading && ' · aggiornamento in corso…'}
          {totalVisible > 0 && ` · ${totalVisible} risultati`}
        </p>
      )}

      {loading && !sectionsToRender.length ? (
        <div className="market-catalog__groups">
          {CATEGORY_SECTIONS.map((s) => (
            <div key={s.id} className="market-catalog__group">
              <div className="market-catalog__group-header market-catalog__group-header--skeleton" />
              <div className="market-catalog__grid market-catalog__grid--loading">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="catalog-card catalog-card--skeleton" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : sectionsToRender.length > 0 ? (
        <div className="market-catalog__groups">
          {sectionsToRender.map((section) => (
            <div
              key={section.id}
              id={`catalog-${section.id}`}
              className={`market-catalog__group market-catalog__group--${section.tone}`}
            >
              <header className="market-catalog__group-header">
                <div className="market-catalog__group-heading">
                  <span className={`market-catalog__category-badge market-catalog__category-badge--${section.tone}`}>
                    {section.title}
                  </span>
                  <h3 className="market-catalog__group-title">{section.title}</h3>
                  <p className="market-catalog__group-subtitle">{section.subtitle}</p>
                </div>
                <span className="market-catalog__group-count">
                  {section.subgroups
                    ? section.subgroups.reduce((a, sg) => a + sg.items.length, 0)
                    : section.items.length}{' '}
                  asset
                </span>
              </header>

              {section.subgroups ? (
                !isMobile && section.id === 'stock' ? (
                  <>
                    <div
                      className="symbol-picker__filters market-catalog__stock-regions"
                      role="group"
                      aria-label="Filtra per area"
                    >
                      <button
                        type="button"
                        className={`symbol-picker__filter ${stockRegion === 'all' ? 'is-active' : ''}`}
                        onClick={() => setStockRegion('all')}
                      >
                        Tutte ({section.subgroups.reduce((a, sg) => a + sg.items.length, 0)})
                      </button>
                      {section.subgroups.map((sg) => (
                        <button
                          key={sg.id}
                          type="button"
                          className={`symbol-picker__filter ${stockRegion === sg.id ? 'is-active' : ''}`}
                          onClick={() => setStockRegion(sg.id)}
                        >
                          {sg.title} ({sg.items.length})
                        </button>
                      ))}
                    </div>
                    <CatalogGrid
                      items={
                        stockRegion === 'all'
                          ? section.subgroups.flatMap((sg) => sg.items)
                          : section.subgroups.find((sg) => sg.id === stockRegion)?.items ?? []
                      }
                      className={gridClassName}
                      selectedType={selectedType}
                      selectedSymbol={selectedSymbol}
                      onSelectAsset={onSelectAsset}
                      onForecast={onForecast}
                      fx={fx}
                      showCategory={showCategoryBadge}
                      forecastLoading={forecastLoading}
                    />
                  </>
                ) : (
                  section.subgroups.map((sg) => (
                    <div key={sg.id} className="market-catalog__subgroup">
                      <h4 className="market-catalog__subgroup-title">
                        <span>{sg.title}</span>
                        <span className="market-catalog__subgroup-count">{sg.items.length}</span>
                      </h4>
                      <CatalogGrid
                        items={sg.items}
                        className={gridClassName}
                        selectedType={selectedType}
                        selectedSymbol={selectedSymbol}
                        onSelectAsset={onSelectAsset}
                        onForecast={onForecast}
                        fx={fx}
                        showCategory={showCategoryBadge}
                        forecastLoading={forecastLoading}
                      />
                    </div>
                  ))
                )
              ) : (
                <CatalogGrid
                  items={section.items}
                  className={gridClassName}
                  selectedType={selectedType}
                  selectedSymbol={selectedSymbol}
                  onSelectAsset={onSelectAsset}
                  onForecast={onForecast}
                  fx={fx}
                  showCategory={showCategoryBadge}
                  forecastLoading={forecastLoading}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        !loading && <p className="market-catalog__empty">Nessun risultato per la ricerca.</p>
      )}
    </section>
  );
}

export { catalogToQuoteMap } from '../utils/catalogPrice';
