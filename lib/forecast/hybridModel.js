import { linearForecast, logReturnForecast } from '../forecastModels.js';
import { adjustPriceByImpact } from '../geopolitical/impactScore.js';

const DEFAULT_WEIGHTS = { w1: 0.35, w2: 0.25, w3: 0.25, w4: 0.15 };

/**
 * Forecast = LinearTrend×W1 + LogReturn×W2 + GeoComponent×W3 + VolatilityFactor×W4
 */
export function hybridForecast({
  prices,
  geoImpactIndex = 0,
  volatilityFactor,
  weights = DEFAULT_WEIGHTS,
  horizonDays = 5,
}) {
  if (!prices?.length) return null;

  const last = prices[prices.length - 1];
  const linear = linearForecast(prices, horizonDays);
  const logRet = logReturnForecast(prices, horizonDays);

  const linearNext = linear?.forecasts?.[0]?.price ?? last;
  const logNext = logRet?.nextPrice ?? last;
  const geoComponent = adjustPriceByImpact(last, geoImpactIndex) ?? last;
  const volFactor = volatilityFactor ?? last;

  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const sumW = w.w1 + w.w2 + w.w3 + w.w4;
  const n1 = w.w1 / sumW;
  const n2 = w.w2 / sumW;
  const n3 = w.w3 / sumW;
  const n4 = w.w4 / sumW;

  const combined =
    linearNext * n1 + logNext * n2 + geoComponent * n3 + volFactor * n4;

  const forecasts = [];
  for (let k = 0; k < horizonDays; k++) {
    const linP = linear?.forecasts?.[k]?.price ?? linearNext;
    const logP = logRet?.forecasts?.[k]?.price ?? logNext;
    const geoP = adjustPriceByImpact(linP, geoImpactIndex) ?? linP;
    const price = linP * n1 + logP * n2 + geoP * n3 + volFactor * n4;
    forecasts.push({
      dayOffset: k + 1,
      price: Number(price.toFixed(4)),
      linear: linP,
      logReturn: logP,
      geoAdjusted: geoP,
    });
  }

  return {
    combined: Number(combined.toFixed(4)),
    components: {
      linearTrend: linearNext,
      logReturn: logNext,
      geoComponent,
      volatilityFactor: volFactor,
    },
    weights: { w1: n1, w2: n2, w3: n3, w4: n4 },
    forecasts,
    formula:
      'Forecast = Linear×W1 + LogReturn×W2 + Geo×W3 + VolFactor×W4',
  };
}
