import axios from 'axios';
import { alphaVantageConfigured } from '../alphavantage.js';
import { isMetalType } from '../marketType.js';

const UA =
  'Mozilla/5.0 (compatible; MarketMonitor/1.0; +https://github.com/market-monitor)';

async function fetchYahooSummary(symbol) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`;
  const { data } = await axios.get(url, {
    params: { modules: 'summaryDetail,defaultKeyStatistics,financialData' },
    timeout: 12_000,
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  const r = data?.quoteSummary?.result?.[0];
  if (!r) return null;
  const sd = r.summaryDetail ?? {};
  const ks = r.defaultKeyStatistics ?? {};
  const fd = r.financialData ?? {};
  const raw = (v) => (v?.raw != null ? v.raw : v);

  return {
    symbol,
    source: 'yahoo',
    pe: raw(sd.trailingPE) ?? raw(ks.trailingPE) ?? null,
    forwardPe: raw(sd.forwardPE) ?? null,
    eps: raw(ks.trailingEps) ?? null,
    dividendYield: raw(sd.dividendYield) != null ? Number((raw(sd.dividendYield) * 100).toFixed(2)) : null,
    marketCap: raw(sd.marketCap) ?? null,
    profitMargin: raw(fd.profitMargins) != null ? Number((raw(fd.profitMargins) * 100).toFixed(2)) : null,
    revenueGrowth: raw(fd.revenueGrowth) != null ? Number((raw(fd.revenueGrowth) * 100).toFixed(2)) : null,
    targetMeanPrice: raw(fd.targetMeanPrice) ?? null,
  };
}

async function fetchAvOverview(symbol, type) {
  const key =
    (isMetalType(type) ? process.env.METALS_API_KEY : process.env.STOCK_API_KEY) ||
    process.env.STOCK_API_KEY;
  if (!key || key.startsWith('LA_TUA')) return null;
  const { data } = await axios.get('https://www.alphavantage.co/query', {
    params: { function: 'OVERVIEW', symbol, apikey: key },
    timeout: 15_000,
  });
  if (!data || data.Note) return null;
  return {
    symbol,
    source: 'alphavantage',
    pe: data.PERatio ? Number(data.PERatio) : null,
    forwardPe: data.ForwardPE ? Number(data.ForwardPE) : null,
    eps: data.EPS ? Number(data.EPS) : null,
    dividendYield: data.DividendYield ? Number((Number(data.DividendYield) * 100).toFixed(2)) : null,
    marketCap: data.MarketCapitalization ? Number(data.MarketCapitalization) : null,
    profitMargin: data.ProfitMargin ? Number((Number(data.ProfitMargin) * 100).toFixed(2)) : null,
    revenueGrowth: data.QuarterlyRevenueGrowthYOY
      ? Number((Number(data.QuarterlyRevenueGrowthYOY) * 100).toFixed(2))
      : null,
    targetMeanPrice: null,
  };
}

/** Dati fondamentali — Yahoo quoteSummary con fallback Alpha Vantage. */
export async function fetchFundamentals(symbol, type = 'stock') {
  const sym = String(symbol).toUpperCase();
  if (!['stock', 'national', 'etf'].includes(type)) {
    return { symbol: sym, available: false, reason: 'Fondamentali disponibili per azioni/ETF' };
  }

  try {
    const y = await fetchYahooSummary(sym);
    if (y && (y.pe != null || y.eps != null || y.dividendYield != null)) {
      return { ...y, available: true };
    }
  } catch {
    /* fallback */
  }

  if (alphaVantageConfigured(type)) {
    try {
      const av = await fetchAvOverview(sym, type);
      if (av) return { ...av, available: true };
    } catch {
      /* ignore */
    }
  }

  return { symbol: sym, available: false, reason: 'Dati fondamentali non disponibili per questo titolo' };
}
