import { useMemo, useState } from 'react';
import { formatShortDate } from '../utils/format';
import { changeTone, formatChangeBadge, formatCurrentPrice } from '../utils/catalogPrice';
import { SORT_OPTIONS, sortAssetItems } from '../utils/sortAssets';

const STOCK_SUBGROUPS = [
  { id: 'US', title: 'Stati Uniti', match: (i) => i.market === 'US' || i.region === 'USA' },
  { id: 'EU', title: 'Europa', match: (i) => i.market === 'EU' || i.region === 'Europa' },
  { id: 'AF', title: 'Africa', match: (i) => i.market === 'AF' || i.region === 'Africa' },
];

const CATEGORY_SECTIONS = [
  {
    id: 'stock',
    title: 'Azioni',
    subtitle: 'Titoli USA, Europa e Africa — prezzo per azione',
    subgroups: STOCK_SUBGROUPS,
    tone: 'stock',
  },
  {
    id: 'national',
    title: 'Azioni nazionali',
    subtitle: 'Blue chip FTSE MIB — quotati in euro',
    tone: 'national',
  },
  {
    id: 'crypto',
    title: 'Criptovalute',
    subtitle: 'Bitcoin, Ethereum e altcoin — prezzo per coin',
    tone: 'crypto',
  },
  {
    id: 'precious',
    title: 'Metalli preziosi',
    subtitle: 'Oro, argento, platino e palladio — prezzo al grammo',
    tone: 'precious',
  },
  {
    id: 'commodity',
    title: 'Materie prime',
    subtitle: 'Petrolio e rame — prezzo al barile o al grammo',
    tone: 'commodity',
  },
];

function CatalogCard({ item, selected, onSelect, onForecast, fx, showCategory, forecastLoading }) {
  const q = item.quote;
  const meta = item;
  const price = formatCurrentPrice(q, meta, fx);
  const tone = changeTone(q?.changePercent);
  const chg = formatChangeBadge(q);
  const categoryLabel =
    item.assetType === 'stock'
      ? 'Azione'
      : item.assetType === 'national'
        ? 'Azione nazionale'
        : item.assetType === 'crypto'
          ? 'Crypto'
          : item.assetType === 'precious'
            ? 'Metallo'
            : item.assetType === 'commodity'
              ? 'Materia prima'
              : null;

  return (
    <article
      className={`catalog-card ${selected ? 'is-selected' : ''} ${!q?.price ? 'is-muted' : ''}`}
    >
      <button type="button" className="catalog-card__body" onClick={() => onSelect?.(item)}>
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
}) {
  if (!items.length) return null;
  return (
    <div className="market-catalog__grid">
      {items.map((item) => (
        <CatalogCard
          key={`${item.assetType}-${item.id}`}
          item={item}
          fx={fx}
          showCategory={showCategory}
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
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const catalogByType = useMemo(
    () => ({
      stock: (catalog?.stock || []).map((i) => ({ ...i, assetType: 'stock' })),
      national: (catalog?.national || []).map((i) => ({ ...i, assetType: 'national' })),
      crypto: (catalog?.crypto || []).map((i) => ({ ...i, assetType: 'crypto' })),
      precious: (catalog?.precious || []).map((i) => ({ ...i, assetType: 'precious' })),
      commodity: (catalog?.commodity || []).map((i) => ({ ...i, assetType: 'commodity' })),
    }),
    [catalog]
  );

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

  const quotedTotal =
    (summary?.stocks?.quoted ?? 0) +
    (summary?.national?.quoted ?? 0) +
    (summary?.crypto?.quoted ?? 0) +
    (summary?.precious?.quoted ?? 0) +
    (summary?.commodities?.quoted ?? 0);
  const assetTotal =
    (summary?.stocks?.total ?? 0) +
    (summary?.national?.total ?? 0) +
    (summary?.crypto?.total ?? 0) +
    (summary?.precious?.total ?? 0) +
    (summary?.commodities?.total ?? 0);

  const showCategoryBadge = showAllCategories;

  return (
    <section className="market-catalog">
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
                section.subgroups.map((sg) => (
                  <div key={sg.id} className="market-catalog__subgroup">
                    <h4 className="market-catalog__subgroup-title">
                      <span>{sg.title}</span>
                      <span className="market-catalog__subgroup-count">{sg.items.length}</span>
                    </h4>
                    <CatalogGrid
                      items={sg.items}
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
              ) : (
                <CatalogGrid
                  items={section.items}
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
