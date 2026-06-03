import { getStockEntry, STOCK_SYMBOLS } from './stockRegistry.js';
import { getNationalStockEntry, NATIONAL_STOCKS } from './nationalStockRegistry.js';
import { CRYPTO_ASSETS } from './cryptoRegistry.js';
import { PRECIOUS_ASSETS, COMMODITY_ASSETS } from './assetRegistry.js';
import { fetchStooqLatestBatch, toStooqSymbol } from './stooq.js';
import { enrichQuoteWithEur } from './quoteEnrich.js';

/** @param {(symbol: string, type: string) => Promise<object>} getMarket */

export async function fetchQuotesForSymbols(symbols, type, { getCachedMarket, loadFx }) {
  const list = symbols.map((s) => String(s).trim()).filter(Boolean);
  if (!list.length) return { results: [], fx: null };

  const fx = await loadFx();
  const stooqSymbols = list.map((s) => toStooqSymbol(s, type));
  let stooqRows = [];

  try {
    stooqRows = await fetchStooqLatestBatch(stooqSymbols);
  } catch (err) {
    console.warn('Stooq batch:', err.message);
  }

  const stooqByDisplay = new Map(
    list.map((display, i) => {
      const row =
        stooqRows.find((r) => r.symbol?.toLowerCase() === stooqSymbols[i].toLowerCase()) ??
        stooqRows[i];
      return [display.toUpperCase(), row];
    })
  );

  const results = [];
  for (const rawSymbol of list) {
    const row = stooqByDisplay.get(rawSymbol.toUpperCase());
    if (row?.price != null || row?.close != null) {
      const entry =
        type === 'stock'
          ? getStockEntry(rawSymbol)
          : type === 'national'
            ? getNationalStockEntry(rawSymbol)
            : null;
      const currency =
        entry?.market === 'EU' || entry?.market === 'IT' || type === 'national' ? 'EUR' : 'USD';
      results.push(
        enrichQuoteWithEur(
          {
            symbol: rawSymbol,
            price: row.close ?? row.price,
            currency,
            change: row.change,
            changePercent: row.changePercent,
            asOf: row.date,
            source: 'stooq',
            stooqSymbol: row.symbol,
          },
          fx
        )
      );
      continue;
    }

    try {
      const { quote } = await getCachedMarket(rawSymbol, type);
      if (quote) results.push(enrichQuoteWithEur(quote, fx));
      else results.push({ symbol: rawSymbol, price: null, error: 'Quotazione non disponibile' });
    } catch (err) {
      results.push({ symbol: rawSymbol, price: null, error: err.message });
    }
  }

  return { results, fx };
}

export async function buildFullCatalog({ getCachedMarket, loadFx }) {
  const [stockPack, nationalPack, cryptoPack, preciousPack, commodityPack] = await Promise.all([
    fetchQuotesForSymbols(
      STOCK_SYMBOLS.map((s) => s.id),
      'stock',
      { getCachedMarket, loadFx }
    ),
    fetchQuotesForSymbols(
      NATIONAL_STOCKS.map((s) => s.id),
      'national',
      { getCachedMarket, loadFx }
    ),
    fetchQuotesForSymbols(
      CRYPTO_ASSETS.map((a) => a.id),
      'crypto',
      { getCachedMarket, loadFx }
    ),
    fetchQuotesForSymbols(
      PRECIOUS_ASSETS.map((a) => a.id),
      'precious',
      { getCachedMarket, loadFx }
    ),
    fetchQuotesForSymbols(
      COMMODITY_ASSETS.map((a) => a.id),
      'commodity',
      { getCachedMarket, loadFx }
    ),
  ]);

  const fx =
    stockPack.fx ||
    nationalPack.fx ||
    cryptoPack.fx ||
    preciousPack.fx ||
    commodityPack.fx;

  function mergeMeta(type, assets, results) {
    const quoteById = new Map(
      results.map((q) => [String(q.symbol).toUpperCase(), q])
    );
    return assets.map((meta) => ({
      ...meta,
      quote: quoteById.get(meta.id.toUpperCase()) ?? null,
    }));
  }

  const stockItems = mergeMeta(
    'stock',
    STOCK_SYMBOLS.map((s) => ({
      id: s.id,
      name: s.name,
      hint: s.hint,
      sector: s.sector,
      region: s.region,
      market: s.market,
      pricingKind: 'perShare',
    })),
    stockPack.results
  );

  const nationalItems = mergeMeta(
    'national',
    NATIONAL_STOCKS.map((s) => ({
      id: s.id,
      name: s.name,
      hint: s.hint,
      sector: s.sector,
      region: s.region,
      market: s.market,
      pricingKind: 'perShare',
    })),
    nationalPack.results
  );

  const cryptoItems = mergeMeta('crypto', CRYPTO_ASSETS, cryptoPack.results);

  const preciousItems = mergeMeta('precious', PRECIOUS_ASSETS, preciousPack.results);
  const commodityItems = mergeMeta('commodity', COMMODITY_ASSETS, commodityPack.results);

  const withPrice = (items) => items.filter((i) => i.quote?.price != null).length;

  return {
    fx,
    updatedAt: new Date().toISOString(),
    summary: {
      stocks: { total: stockItems.length, quoted: withPrice(stockItems) },
      national: { total: nationalItems.length, quoted: withPrice(nationalItems) },
      crypto: { total: cryptoItems.length, quoted: withPrice(cryptoItems) },
      precious: { total: preciousItems.length, quoted: withPrice(preciousItems) },
      commodities: { total: commodityItems.length, quoted: withPrice(commodityItems) },
    },
    catalog: {
      stock: stockItems,
      national: nationalItems,
      crypto: cryptoItems,
      precious: preciousItems,
      commodity: commodityItems,
    },
  };
}
