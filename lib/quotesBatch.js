import { getStockEntry, STOCK_SYMBOLS } from './stockRegistry.js';
import { getNationalStockEntry, NATIONAL_STOCKS } from './nationalStockRegistry.js';
import {
  CRYPTO_ASSETS,
  PRECIOUS_ASSETS,
  COMMODITY_ASSETS,
  INDEX_ASSETS,
  FOREX_ASSETS,
  ETF_ASSETS,
  VOLATILITY_ASSETS,
  RATES_ASSETS,
  MACRO_ASSETS,
  SENTIMENT_ASSETS,
} from './assetRegistry.js';
import { fetchStooqLatestBatch, toStooqSymbol, stooqSupported } from './stooq.js';
import { enrichQuoteWithEur } from './quoteEnrich.js';

const QUOTE_FETCH_TIMEOUT_MS = Number(process.env.QUOTE_FETCH_TIMEOUT_MS) || 10_000;
const QUOTE_FETCH_CONCURRENCY = Number(process.env.QUOTE_FETCH_CONCURRENCY) || 4;

function withTimeout(promise, ms, label = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

async function mapPool(items, mapper, concurrency = QUOTE_FETCH_CONCURRENCY) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await mapper(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** @param {(symbol: string, type: string) => Promise<object>} getMarket */

export async function fetchQuotesForSymbols(symbols, type, { getCachedMarket, loadFx, fx: fxIn, stooqOnly = false }) {
  const list = symbols.map((s) => String(s).trim()).filter(Boolean);
  if (!list.length) return { results: [], fx: fxIn ?? null };

  const fx = fxIn ?? (loadFx ? await loadFx() : null);
  const stooqPairs = list
    .map((display) => ({
      display,
      symbol: stooqSupported(display, type) ? toStooqSymbol(display, type) : null,
    }))
    .filter((p) => p.symbol);

  let stooqRows = [];
  if (stooqPairs.length) {
    try {
      stooqRows = await fetchStooqLatestBatch(stooqPairs.map((p) => p.symbol));
    } catch (err) {
      const msg = err.message ?? '';
      if (!msg.includes('404')) {
        console.warn('Stooq batch:', msg);
      }
    }
  }

  const stooqByDisplay = new Map(
    stooqPairs.map((pair, i) => {
      const row =
        stooqRows.find((r) => r.symbol?.toLowerCase() === pair.symbol.toLowerCase()) ??
        stooqRows[i];
      return [pair.display.toUpperCase(), row];
    })
  );

  const results = [];
  const pending = [];

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
    } else {
      pending.push(rawSymbol);
    }
  }

  if (pending.length && !stooqOnly) {
    const fetched = await mapPool(pending, async (rawSymbol) => {
      try {
        const { quote } = await withTimeout(
          getCachedMarket(rawSymbol, type, { allowStale: true }),
          QUOTE_FETCH_TIMEOUT_MS,
          `Timeout quotazione ${rawSymbol}`
        );
        if (quote) return enrichQuoteWithEur(quote, fx);
        return { symbol: rawSymbol, price: null, error: 'Quotazione non disponibile' };
      } catch (err) {
        return { symbol: rawSymbol, price: null, error: err.message };
      }
    });
    results.push(...fetched);
  }

  if (pending.length && stooqOnly) {
    for (const rawSymbol of pending) {
      results.push({ symbol: rawSymbol, price: null, error: 'Quotazione non disponibile' });
    }
  }

  return { results, fx };
}

function mergeMeta(assets, results) {
  const quoteById = new Map(results.map((q) => [String(q.symbol).toUpperCase(), q]));
  return assets.map((meta) => ({
    ...meta,
    quote: quoteById.get(meta.id.toUpperCase()) ?? null,
  }));
}

const CATALOG_SPECS = [
  {
    key: 'stock',
    type: 'stock',
    assets: STOCK_SYMBOLS.map((s) => ({
      id: s.id,
      name: s.name,
      hint: s.hint,
      sector: s.sector,
      region: s.region,
      market: s.market,
      pricingKind: 'perShare',
    })),
    summaryKey: 'stocks',
  },
  {
    key: 'national',
    type: 'national',
    assets: NATIONAL_STOCKS.map((s) => ({
      id: s.id,
      name: s.name,
      hint: s.hint,
      sector: s.sector,
      region: s.region,
      market: s.market,
      pricingKind: 'perShare',
    })),
    summaryKey: 'national',
  },
  { key: 'index', type: 'index', assets: INDEX_ASSETS, summaryKey: 'indices' },
  { key: 'forex', type: 'forex', assets: FOREX_ASSETS, summaryKey: 'forex' },
  { key: 'crypto', type: 'crypto', assets: CRYPTO_ASSETS, summaryKey: 'crypto' },
  { key: 'precious', type: 'precious', assets: PRECIOUS_ASSETS, summaryKey: 'precious' },
  { key: 'commodity', type: 'commodity', assets: COMMODITY_ASSETS, summaryKey: 'commodities' },
  { key: 'etf', type: 'etf', assets: ETF_ASSETS, summaryKey: 'etf' },
  { key: 'volatility', type: 'volatility', assets: VOLATILITY_ASSETS, summaryKey: 'volatility' },
  { key: 'rates', type: 'rates', assets: RATES_ASSETS, summaryKey: 'rates' },
  { key: 'macro', type: 'macro', assets: MACRO_ASSETS, summaryKey: 'macro' },
  { key: 'sentiment', type: 'sentiment', assets: SENTIMENT_ASSETS, summaryKey: 'sentiment' },
];

export function buildSkeletonCatalog() {
  const catalog = {};
  const summary = {};
  for (const spec of CATALOG_SPECS) {
    const items = spec.assets.map((meta) => ({ ...meta, quote: null }));
    catalog[spec.key] = items;
    summary[spec.summaryKey] = { total: items.length, quoted: 0 };
  }
  return {
    fx: null,
    updatedAt: new Date().toISOString(),
    summary,
    catalog,
  };
}

export async function buildFullCatalog({ getCachedMarket, loadFx }) {
  const fx = loadFx ? await loadFx() : null;
  const packs = [];
  for (const spec of CATALOG_SPECS) {
    packs.push(
      await fetchQuotesForSymbols(spec.assets.map((a) => a.id), spec.type, {
        getCachedMarket,
        fx,
        stooqOnly: true,
      })
    );
  }

  const withPrice = (items) => items.filter((i) => i.quote?.price != null).length;

  const catalog = {};
  const summary = {};

  CATALOG_SPECS.forEach((spec, i) => {
    const items = mergeMeta(spec.assets, packs[i].results);
    catalog[spec.key] = items;
    summary[spec.summaryKey] = { total: items.length, quoted: withPrice(items) };
  });

  return {
    fx,
    updatedAt: new Date().toISOString(),
    summary,
    catalog,
  };
}
