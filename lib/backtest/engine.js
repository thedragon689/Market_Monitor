import { maxDrawdown } from '../risk/riskEngine.js';

function closes(series) {
  return series.map((p) => Number(p.price ?? p.close)).filter(Number.isFinite);
}

function dailyReturns(prices) {
  const out = [];
  for (let i = 1; i < prices.length; i += 1) {
    if (prices[i - 1]) out.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return out;
}

function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function sharpeRatio(returns, annualize = 252) {
  if (!returns.length) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance);
  if (!std) return null;
  return Number(((mean / std) * Math.sqrt(annualize)).toFixed(3));
}

function sortinoRatio(returns, annualize = 252) {
  if (!returns.length) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downside = returns.filter((r) => r < 0);
  if (!downside.length) return null;
  const dsVar = downside.reduce((s, r) => s + r ** 2, 0) / downside.length;
  const dsStd = Math.sqrt(dsVar);
  if (!dsStd) return null;
  return Number(((mean / dsStd) * Math.sqrt(annualize)).toFixed(3));
}

function simulateBuyHold(prices) {
  const equity = [1];
  for (let i = 1; i < prices.length; i += 1) {
    equity.push(prices[i] / prices[0]);
  }
  return { equity, trades: 1 };
}

function simulateSmaCross(prices, fast = 20, slow = 50) {
  const fastLine = sma(prices, fast);
  const slowLine = sma(prices, slow);
  let position = 0;
  let entry = prices[0];
  const equity = [1];
  let trades = 0;

  for (let i = 1; i < prices.length; i += 1) {
    const prevEq = equity[i - 1];
    if (fastLine[i - 1] != null && slowLine[i - 1] != null && fastLine[i] != null && slowLine[i]) {
      const wasAbove = fastLine[i - 1] > slowLine[i - 1];
      const isAbove = fastLine[i] > slowLine[i];
      if (!wasAbove && isAbove && position === 0) {
        position = 1;
        entry = prices[i];
        trades += 1;
      } else if (wasAbove && !isAbove && position === 1) {
        position = 0;
        trades += 1;
      }
    }
    const ret = position === 1 ? (prices[i] - prices[i - 1]) / prices[i - 1] : 0;
    equity.push(prevEq * (1 + ret));
  }
  return { equity, trades };
}

/**
 * Backtest su serie storica — strategie: buy_hold, sma_cross.
 */
export function runBacktest(series, { strategy = 'buy_hold', fast = 20, slow = 50 } = {}) {
  const prices = closes(series);
  if (prices.length < 30) {
    return { error: 'Serie troppo corta (min 30 punti)' };
  }

  const sim =
    strategy === 'sma_cross'
      ? simulateSmaCross(prices, fast, slow)
      : simulateBuyHold(prices);

  const returns = dailyReturns(sim.equity);
  const dd = maxDrawdown(sim.equity);
  const totalReturn = ((sim.equity[sim.equity.length - 1] - 1) * 100).toFixed(2);

  return {
    strategy,
    params: strategy === 'sma_cross' ? { fast, slow } : {},
    metrics: {
      totalReturnPct: Number(totalReturn),
      sharpe: sharpeRatio(returns),
      sortino: sortinoRatio(returns),
      maxDrawdownPct: dd?.maxDrawdown ?? null,
      trades: sim.trades,
      observations: prices.length,
    },
    equityCurve: series.slice(-sim.equity.length).map((p, i) => ({
      date: p.date ?? p.time,
      equity: Number(sim.equity[i].toFixed(4)),
      price: prices[i],
    })),
  };
}
