import { bollinger, sma } from '../indicators.js';
import { betaLogReturnsAligned } from '../math/seriesAlign.js';
import { fetchYahooChartDirect } from '../yahooChartDirect.js';

/** ATR semplificato (solo close: |C - C_prev|). */
export function atrFromCloses(prices, period = 14) {
  if (!prices?.length || prices.length < period + 1) return null;

  const trs = [];
  for (let i = prices.length - period; i < prices.length; i++) {
    trs.push(Math.abs(prices[i] - prices[i - 1]));
  }
  const value = trs.reduce((a, b) => a + b, 0) / trs.length;
  const last = prices[prices.length - 1];
  return {
    value: Number(value.toFixed(4)),
    pctOfPrice: last ? Number(((value / last) * 100).toFixed(3)) : null,
    period,
  };
}

export function maxDrawdown(prices) {
  if (!prices?.length) return null;
  let peak = prices[0];
  let maxDd = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return {
    maxDrawdown: Number((maxDd * 100).toFixed(2)),
    maxDrawdownRatio: Number(maxDd.toFixed(4)),
  };
}

/** Beta vs benchmark (allineamento per lunghezza minima). */
export function computeBeta(assetPrices, benchPrices) {
  const n = Math.min(assetPrices.length, benchPrices.length);
  if (n < 10) return null;

  const a = assetPrices.slice(-n);
  const b = benchPrices.slice(-n);
  const retA = [];
  const retB = [];
  for (let i = 1; i < n; i++) {
    if (a[i - 1] && b[i - 1]) {
      retA.push((a[i] - a[i - 1]) / a[i - 1]);
      retB.push((b[i] - b[i - 1]) / b[i - 1]);
    }
  }
  if (retA.length < 5) return null;

  const meanA = retA.reduce((x, y) => x + y, 0) / retA.length;
  const meanB = retB.reduce((x, y) => x + y, 0) / retB.length;
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < retA.length; i++) {
    cov += (retA[i] - meanA) * (retB[i] - meanB);
    varB += (retB[i] - meanB) ** 2;
  }
  cov /= retA.length;
  varB /= retB.length;
  if (varB === 0) return null;

  const beta = cov / varB;
  return {
    beta: Number(beta.toFixed(3)),
    observations: retA.length,
    benchmark: 'SPY',
  };
}

export async function fetchVix() {
  try {
    const { quote, series } = await fetchYahooChartDirect('^VIX', '5d');
    return {
      symbol: '^VIX',
      price: quote?.price ?? series?.[series.length - 1]?.price,
      asOf: quote?.asOf,
      changePercent: quote?.changePercent,
      label: 'VIX (indice paura)',
    };
  } catch (err) {
    return { symbol: '^VIX', error: err.message };
  }
}

export function volatilityFactorFromBollinger(prices) {
  const bb = bollinger(prices, 20);
  if (!bb || !bb.middle) return { factor: prices.at(-1), bandwidth: 0 };
  const bandwidth = (bb.upper - bb.lower) / bb.middle;
  const last = prices[prices.length - 1];
  const factor = last * (1 - Math.min(0.15, bandwidth * 0.5));
  return {
    factor: Number(factor.toFixed(4)),
    bandwidth: Number(bandwidth.toFixed(4)),
    upper: bb.upper,
    lower: bb.lower,
    middle: bb.middle,
  };
}

export async function buildRiskProfile(
  prices,
  { benchPrices, assetSeries, benchSeries, benchmark = 'SPY' } = {}
) {
  const atr = atrFromCloses(prices, 14);
  const drawdown = maxDrawdown(prices);
  const bbVol = volatilityFactorFromBollinger(prices);

  let beta = null;
  if (assetSeries?.length && benchSeries?.length) {
    const aligned = betaLogReturnsAligned(assetSeries, benchSeries);
    if (aligned) {
      beta = { ...aligned, benchmark };
    }
  } else if (benchPrices?.length) {
    const legacy = computeBeta(prices, benchPrices);
    if (legacy) {
      beta = { ...legacy, benchmark, method: 'simple_returns_tail' };
    }
  }

  const vix = await fetchVix();

  return {
    atr,
    drawdown,
    bollingerVolatility: bbVol,
    beta,
    vix,
    sma20: sma(prices, 20),
    sma50: sma(prices, Math.min(50, prices.length)),
  };
}
