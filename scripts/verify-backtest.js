#!/usr/bin/env node
import { runBacktest } from '../lib/backtest/engine.js';

const series = Array.from({ length: 120 }, (_, i) => ({
  date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
  price: 100 + Math.sin(i / 8) * 10 + i * 0.15,
}));

const bh = runBacktest(series, { strategy: 'buy_hold' });
if (!bh.metrics?.sharpe && bh.metrics?.sharpe !== 0) throw new Error('Sharpe missing');
if (bh.metrics.totalReturnPct == null) throw new Error('return missing');

const cross = runBacktest(series, { strategy: 'sma_cross', fast: 10, slow: 30 });
if (!cross.equityCurve?.length) throw new Error('equity curve missing');

console.log('✓ Backtest OK', bh.metrics.sharpe, cross.metrics.trades);
