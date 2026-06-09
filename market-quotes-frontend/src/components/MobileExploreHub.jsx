import { useEffect, useMemo, useState } from 'react';
import { getCategoryMeta } from '../data/categories';
import { getSymbolsForType } from '../data/symbols';
import { changeTone, formatChangeBadge, formatCurrentPrice } from '../utils/catalogPrice';
import MobileAssetHero from './MobileAssetHero';
import MobileCategoryBar from './MobileCategoryBar';
import MobileMarketStrip from './MobileMarketStrip';
import Watchlist from './Watchlist';
import MarketOverview from './MarketOverview';
import TerminalTopMovers from './terminal/TerminalTopMovers';

const STOCK_REGIONS = [
  { id: 'all', label: 'Tutti' },
  { id: 'US', label: 'USA' },
  { id: 'EU', label: 'Europa' },
  { id: 'AF', label: 'Africa' },
];

function matchesRegion(item, region) {
  if (region === 'all') return true;
  if (region === 'US') return item.market === 'US' || item.region === 'USA';
  if (region === 'EU') return item.market === 'EU' || item.region === 'Europa';
  if (region === 'AF') return item.market === 'AF' || item.region === 'Africa';
  return true;
}

function matchesQuery(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.id.toLowerCase().includes(q) ||
    item.name.toLowerCase().includes(q) ||
    (item.hint || '').toLowerCase().includes(q) ||
    (item.region || '').toLowerCase().includes(q) ||
    (item.sector || '').toLowerCase().includes(q)
  );
}

function AssetRow({ item, selected, quote, fx, onSelect }) {
  const price = formatCurrentPrice(quote, item, fx);
  const chg = formatChangeBadge(quote);
  const tone = changeTone(quote?.changePercent);

  return (
    <button
      type="button"
      className={`mobile-asset-row ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(item.id, item.assetType)}
    >
      <span className="mobile-asset-row__avatar" aria-hidden>
        {item.name.charAt(0).toUpperCase()}
      </span>
      <span className="mobile-asset-row__main">
        <span className="mobile-asset-row__name">{item.name}</span>
        <span className="mobile-asset-row__code">{item.id}</span>
      </span>
      <span className="mobile-asset-row__quote">
        <span className="mobile-asset-row__price">
          {price.primary}
          {price.unit && <span className="mobile-asset-row__unit">{price.unit}</span>}
        </span>
        {chg != null ? (
          <span className={`mobile-asset-row__chg mobile-asset-row__chg--${tone}`}>{chg}</span>
        ) : (
          <span className="mobile-asset-row__chg mobile-asset-row__chg--neutral">—</span>
        )}
      </span>
    </button>
  );
}

export default function MobileExploreHub({
  type,
  symbol,
  catalog,
  catalogSummary,
  catalogUpdatedAt,
  quote,
  fx,
  loadingCatalog,
  loadingMarket,
  quotesBySymbol,
  onSelectAsset,
  onSelectCategory,
  onAnalyze,
  onWatchlistSelect,
  onTypeChange,
  onRefresh,
  onForecast,
}) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const categoryMeta = getCategoryMeta(type);

  useEffect(() => {
    setQuery('');
    setRegion('all');
  }, [type]);

  const items = useMemo(() => {
    const fromCatalog = (catalog?.[type] || []).map((i) => ({
      ...i,
      assetType: type,
    }));
    const base =
      fromCatalog.length > 0
        ? fromCatalog
        : getSymbolsForType(type).map((i) => ({ ...i, assetType: type }));

    return base
      .filter((i) => matchesRegion(i, region))
      .filter((i) => matchesQuery(i, query))
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [catalog, type, region, query]);

  return (
    <div className="mobile-explore">
      <MobileMarketStrip
        summary={catalogSummary}
        fx={fx}
        updatedAt={catalogUpdatedAt}
        loading={loadingCatalog}
      />

      <MobileCategoryBar
        type={type}
        onTypeChange={onTypeChange}
        summary={catalogSummary}
      />

      <MarketOverview
        catalog={catalog}
        summary={catalogSummary}
        loading={loadingCatalog}
        fx={fx}
        onSelectCategory={onSelectCategory || onTypeChange}
        onSelectAsset={onSelectAsset}
      />

      <MobileAssetHero
        type={type}
        symbol={symbol}
        quote={quote}
        fx={fx}
        loading={loadingMarket}
        onAnalyze={onAnalyze}
        onForecast={onForecast}
      />

      <div className="mobile-explore__search-wrap">
        <span className="mobile-explore__search-icon" aria-hidden>
          ⌕
        </span>
        <input
          type="search"
          className="mobile-explore__search"
          placeholder={`Cerca in ${categoryMeta.label.toLowerCase()}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cerca asset per nome o simbolo"
        />
        {query && (
          <button
            type="button"
            className="mobile-explore__search-clear"
            onClick={() => setQuery('')}
            aria-label="Cancella ricerca"
          >
            ×
          </button>
        )}
      </div>

      {type === 'stock' && (
        <div className="mobile-explore__filters" role="group" aria-label="Filtra per area">
          {STOCK_REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`mobile-explore__filter ${region === r.id ? 'is-active' : ''}`}
              onClick={() => setRegion(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <section className="mobile-explore__movers app-card">
        <h3 className="mobile-explore__section-title">Movers del giorno</h3>
        <TerminalTopMovers
          catalog={catalog}
          fx={fx}
          loading={loadingCatalog}
          onSelect={onSelectAsset}
        />
      </section>

      <Watchlist
        symbol={symbol}
        type={type}
        onSelect={onWatchlistSelect}
        quotesBySymbol={quotesBySymbol}
        fx={fx}
      />

      <div className="mobile-explore__list-head">
        <h3 className="mobile-explore__list-title">{categoryMeta.label}</h3>
        <span className="mobile-explore__list-count">
          {loadingCatalog ? '…' : `${items.length} titoli`}
        </span>
        <button
          type="button"
          className="mobile-explore__refresh"
          onClick={onRefresh}
          disabled={loadingMarket || loadingCatalog}
          aria-label="Aggiorna quotazioni"
        >
          ↻
        </button>
      </div>

      <div className="mobile-explore__list" role="list">
        {items.length === 0 ? (
          <p className="mobile-explore__empty">
            Nessun risultato{query ? ` per «${query}»` : ''}. Prova un altro nome o filtro.
          </p>
        ) : (
          items.map((item) => {
            const q =
              quotesBySymbol?.[item.id.toUpperCase()] ?? quotesBySymbol?.[item.id];
            return (
              <AssetRow
                key={item.id}
                item={item}
                selected={symbol === item.id}
                quote={q}
                fx={fx}
                onSelect={onSelectAsset}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
