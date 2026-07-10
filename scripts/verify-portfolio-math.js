#!/usr/bin/env node
/**
 * Test unitari calcoli portfolio (P/L, prezzo medio).
 */
import assert from 'node:assert/strict';
import { toBaseCurrency } from '../lib/portfolio/currency.js';
import { avgPriceAfterBuy, calcPosition, sumDashboard } from '../lib/portfolio/math.js';

const FX = { eurUsd: 1.1 };

// Prezzo medio ponderato
const avg = avgPriceAfterBuy(10, 100, 5, 120);
assert.ok(Math.abs(avg - 106.666666) < 0.001, 'avgPriceAfterBuy');

// P/L positivo
const pos = calcPosition({ quantity: 10, avgPrice: 100, currentPrice: 110 });
assert.equal(pos.currentValue, 1100);
assert.equal(pos.pl, 100);
assert.ok(Math.abs(pos.plPercent - 10) < 0.0001, 'plPercent');

// P/L negativo
const neg = calcPosition({ quantity: 2, avgPrice: 50, currentPrice: 40 });
assert.ok(Math.abs(neg.pl - (-20)) < 0.0001, 'neg pl');
assert.ok(Math.abs(neg.plPercent - (-20)) < 0.0001, 'neg plPercent');

// Dashboard — valori in EUR base
const dash = sumDashboard([
  { currentValueBase: 1000, costBasisBase: 800 },
  { currentValueBase: 500, costBasisBase: 600 },
]);
assert.equal(dash.totalValue, 1500);
assert.equal(dash.totalCost, 1400);
assert.equal(dash.totalPl, 100);
assert.equal(dash.baseCurrency, 'EUR');

// Dashboard — posizione senza prezzo live → P/L non calcolabile (null)
const partial = sumDashboard([
  { currentValueBase: 1000, costBasisBase: 800, costBasis: 800 },
  { currentValueBase: null, costBasisBase: 400, costBasis: 400 },
]);
assert.equal(partial.totalValue, 1000);
assert.equal(partial.totalCost, 1200);
assert.equal(partial.totalPl, null);
assert.equal(partial.totalPlPercent, null);
assert.equal(partial.partial, true);

// Conversione FX USD → EUR
assert.ok(Math.abs(toBaseCurrency(110, 'USD', FX) - 100) < 0.001, 'usd to eur');

console.log('portfolio math: tutti i test passati');
