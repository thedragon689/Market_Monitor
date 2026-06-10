import MobileHomeFeed from './mobile/MobileHomeFeed';
import MobileMarketsBrowse from './mobile/MobileMarketsBrowse';
import MobileFavoritesView from './mobile/MobileFavoritesView';

export default function MobileExploreHub({
  tab = 'home',
  type,
  symbol,
  catalog,
  catalogSummary,
  fx,
  loadingCatalog,
  refreshingCatalog = false,
  loadingMarket,
  refreshingMarket = false,
  quotesBySymbol,
  onSelectAsset,
  onTypeChange,
  onRefresh,
  searchFocus = false,
}) {
  if (tab === 'markets') {
    return (
      <MobileMarketsBrowse
        type={type}
        symbol={symbol}
        catalog={catalog}
        catalogSummary={catalogSummary}
        loadingCatalog={loadingCatalog}
        refreshingCatalog={refreshingCatalog}
        loadingMarket={loadingMarket}
        quotesBySymbol={quotesBySymbol}
        fx={fx}
        onSelectAsset={onSelectAsset}
        onTypeChange={onTypeChange}
        onRefresh={onRefresh}
        searchFocus={searchFocus}
      />
    );
  }

  if (tab === 'favorites') {
    return (
      <MobileFavoritesView
        symbol={symbol}
        type={type}
        quotesBySymbol={quotesBySymbol}
        fx={fx}
        onSelect={onSelectAsset}
      />
    );
  }

  return (
    <MobileHomeFeed
      catalog={catalog}
      fx={fx}
      loading={loadingCatalog}
      refreshing={refreshingCatalog || refreshingMarket}
      onSelectAsset={onSelectAsset}
    />
  );
}
