/**
 * Verifica formule critiche — eseguire: npm run verify:math
 */
import { linearForecast, logReturnForecast, smaForecast } from '../lib/forecastModels.js';
import { cci, williamsR, momentum, atr, sma, bollinger, ema } from '../lib/indicators.js';
import { prophetForecast } from '../lib/forecast/prophetModel.js';
import { arimaForecast } from '../lib/forecast/arimaModel.js';
import { lstmForecast } from '../lib/forecast/lstmModel.js';
import { hybridForecast } from '../lib/forecast/hybridModel.js';
import { polynomialForecast } from '../lib/ml/polynomialForecast.js';
import { betaLogReturnsAligned, pearsonLogReturnsAligned } from '../lib/math/seriesAlign.js';
import { computeBeta } from '../lib/risk/riskEngine.js';
import { randomForestPredict } from '../lib/ml/ensembleForest.js';
import { historicalVolatility } from '../lib/commodity/volatility.js';
import { rsi } from '../lib/indicators.js';
import { inferQuoteCurrency } from '../lib/math/currency.js';

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

function assertNear(actual, expected, tol, msg) {
  assert(
    actual != null && Math.abs(actual - expected) <= tol,
    `${msg} (got ${actual}, expected ≈${expected})`
  );
}

// ── Previsioni classiche ─────────────────────────────────────────────
const prices = [3, 5, 7, 9, 11];
const lin = linearForecast(prices, 1, 5);
assertNear(lin?.slope, 2, 0.01, 'linear slope≈2');
assert(lin.forecasts[0].price === 13, `linear next=13 (got ${lin?.forecasts[0]?.price})`);

const smaFc = smaForecast([10, 20, 30], 3, 2);
assert(smaFc?.level === 20, `SMA level=20 (got ${smaFc?.level})`);
assert(smaFc.forecasts.every((f) => f.price === 20), 'SMA forecasts flat');

const logFc = logReturnForecast([100, 102, 104, 106], 2);
assert(logFc?.forecasts?.length === 2, 'log-return horizon=2');
assert(
  logFc.forecasts[0].price > 106 && logFc.forecasts[1].price > logFc.forecasts[0].price,
  'log-return compound up'
);

// Overlay grafico: ultimo punto finestra = slope*N+intercept
const hist = Array.from({ length: 10 }, (_, i) => 50 + i);
const w = 5;
const reg = linearForecast(hist, 3, w);
const fitStart = hist.length - w + 1;
const localT = w;
assertNear(
  reg.slope * localT + reg.intercept,
  reg.fittedAtEnd,
  0.001,
  'linear fittedAtEnd coerente con finestra N'
);
assert(fitStart === 6, `fitStart overlay=${fitStart}`);

// ── Correlazioni ─────────────────────────────────────────────────────
const s1 = [
  { date: '2024-01-01', price: 100 },
  { date: '2024-01-02', price: 102 },
  { date: '2024-01-03', price: 101 },
  { date: '2024-01-04', price: 105 },
  { date: '2024-01-05', price: 104 },
  { date: '2024-01-06', price: 108 },
  { date: '2024-01-07', price: 107 },
  { date: '2024-01-08', price: 110 },
  { date: '2024-01-09', price: 109 },
];
assert(pearsonLogReturnsAligned(s1, s1) > 0.99, `self log-corr≈1 (got ${pearsonLogReturnsAligned(s1, s1)})`);

const inv = s1.map((p, i) => ({
  date: p.date,
  price: 120 - (p.price - 100) * 0.5,
}));
const negCorr = pearsonLogReturnsAligned(s1, inv);
assert(negCorr != null && negCorr < -0.3, `inverse log-corr negative (got ${negCorr})`);

// ── Indicatori tecnici ───────────────────────────────────────────────
const up = Array.from({ length: 20 }, (_, i) => 100 + i);
assert(rsi(up, 14) > 70, `RSI uptrend>70 (got ${rsi(up, 14)})`);

const flat = Array.from({ length: 25 }, () => 50);
assertNear(sma(flat, 20), 50, 0.001, 'SMA flat=50');
assertNear(bollinger(flat, 20)?.middle, 50, 0.001, 'Bollinger middle=SMA');
assert(bollinger(flat, 20)?.upper === bollinger(flat, 20)?.lower, 'Bollinger zero vol');

const emaVal = ema(up, 5);
const sma5 = sma(up, 5);
assert(emaVal != null && sma5 != null && emaVal >= up[up.length - 1] - 5, 'EMA near recent prices on uptrend');

const down = Array.from({ length: 20 }, (_, i) => 200 - i * 2);
const wrDown = williamsR(down, 14);
assert(wrDown != null && wrDown <= -50, `Williams downtrend oversold zone (got ${wrDown})`);

const cciVal = cci(up, 14);
assert(cciVal != null && cciVal > 0, `CCI uptrend positive (got ${cciVal})`);

const mom = momentum(up, 14);
assert(mom != null && mom > 0, `momentum up>0 (got ${mom})`);

const atrVal = atr(up, 14);
assert(atrVal?.value > 0 && atrVal?.pctOfPrice > 0, 'ATR positive on varying series');

// ── Valute ───────────────────────────────────────────────────────────
assert(inferQuoteCurrency('national', null, 'ENEL.MI') === 'EUR', 'national=EUR');
assert(inferQuoteCurrency('stock', null, 'AAPL') === 'USD', 'US stock=USD');

// ── ML / serie temporali ─────────────────────────────────────────────
const trend = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
const arima = arimaForecast(trend, 3);
assert(arima?.forecasts?.length === 3, 'ARIMA horizon=3');
assert(arima.forecasts[2].price > trend[trend.length - 1], `ARIMA uptrend (got ${arima?.forecasts?.[2]?.price})`);

const lstm1 = lstmForecast(trend, 2);
const lstm2 = lstmForecast(trend, 2);
assert(lstm1?.forecasts?.length === 2, 'LSTM horizon=2');
assert(lstm1.forecasts[0].price === lstm2.forecasts[0].price, 'LSTM deterministico (stesso seed)');
assert(Number.isFinite(lstm1.forecasts[0].price), 'LSTM price finite');

const prophet = prophetForecast(trend, 2);
assert(prophet?.forecasts?.length === 2, 'Prophet horizon=2');
assert(
  prophet.forecasts[1].price > trend[trend.length - 1],
  'Prophet above last price on uptrend'
);

const poly = polynomialForecast(trend, 2, 2);
assert(poly?.forecasts?.length === 2, 'Polynomial horizon=2');

// ── Rischio / ibrido / volatilità ────────────────────────────────────
const asset = trend;
const bench = trend.map((p) => p * 0.8 + 10);
const beta = computeBeta(asset, bench);
assert(beta?.beta != null && beta.beta > 0, `Beta legacy positive (got ${beta?.beta})`);

const assetSeries = trend.map((price, i) => ({ date: `2024-01-${String(i + 1).padStart(2, '0')}`, price }));
const benchSeries = bench.map((price, i) => ({ date: `2024-01-${String(i + 1).padStart(2, '0')}`, price }));
const betaAligned = betaLogReturnsAligned(assetSeries, benchSeries);
assert(
  betaAligned?.beta != null && betaAligned.method === 'log_returns_aligned',
  `Beta aligned log-returns (got ${betaAligned?.beta})`
);

const rf1 = randomForestPredict(trend, {}, 1);
const rf2 = randomForestPredict(trend, {}, 1);
assert(rf1?.nextPrice === rf2?.nextPrice, 'Random Forest deterministico');

const hybrid = hybridForecast({
  prices: trend,
  geoImpactIndex: 2,
  volatilityFactor: trend[trend.length - 1],
  horizonDays: 3,
});
const wSum =
  hybrid.weights.w1 + hybrid.weights.w2 + hybrid.weights.w3 + hybrid.weights.w4;
assertNear(wSum, 1, 0.001, 'Hybrid weights sum to 1');
assert(hybrid.forecasts.length === 3, 'Hybrid horizon=3');

const hvol = historicalVolatility(trend, 20);
assert(hvol?.annualized > 0, `Historical vol annualized>0 (got ${hvol?.annualized})`);

// ── Soglie minime dati ───────────────────────────────────────────────
assert(arimaForecast(trend.slice(0, 10), 2) === null, 'ARIMA rejects <18 points');
assert(lstmForecast(trend.slice(0, 20), 2) === null, 'LSTM rejects <28 points');
assert(prophetForecast(trend.slice(0, 20), 2) === null, 'Prophet rejects <30 points');

if (failed) {
  console.error(`\n${failed} test falliti`);
  process.exit(1);
}
console.log('\nTutti i controlli matematici passati.');
