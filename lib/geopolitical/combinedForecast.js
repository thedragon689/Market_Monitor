import { buildForecastResponse } from '../forecastApi.js';
import { fetchGeopoliticalNews } from './newsFeed.js';
import {
  adjustForecast,
  forecastWithGeopolitics,
} from './geoForecast.js';
import { scoreNewsItemAdvanced } from './nlpSentiment.js';
import { classifyNewsItem } from './eventClassifier.js';
import {
  computeGeopoliticalImpactScore,
  adjustPriceByImpact,
} from './impactScore.js';
import { hybridForecast } from '../forecast/hybridModel.js';
import { buildRiskProfile } from '../risk/riskEngine.js';
import { detectMarketRegime } from '../market/regimeDetection.js';
import { generateIntelligentAlerts } from '../alerts/intelligentAlerts.js';
import { computeVolatility, volatilityAdjustment } from './volatility.js';

function pickTechnicalBase(forecast, prices) {
  const last = prices[prices.length - 1];
  return (
    forecast?.methods?.linearRegression?.nextDay ??
    forecast?.methods?.logReturn?.nextDay ??
    forecast?.methods?.sma?.nextDay ??
    last
  );
}

/** Serie storica: prezzo reale vs scenario aggiustato per indice geo corrente. */
export function buildGeoImpactSeries(series, geoIndex) {
  return series.map((point) => {
    const geoAdjustedPrice = adjustForecast(point.price, geoIndex);
    const geoImpact = geoAdjustedPrice - point.price;
    return {
      date: point.date,
      price: point.price,
      geoAdjustedPrice,
      geoImpact,
      geoImpactPct: point.price ? (geoImpact / point.price) * 100 : 0,
    };
  });
}

/**
 * Modello combinato: tecnico + geopolitico + volatilità.
 * Pesi: 50% tecnico puro, 35% geo-adjusted, 15% vol-damped.
 */
export function combineForecastModels({
  technicalPrice,
  geoAdjustedPrice,
  lastPrice,
  volDaily,
  geoIndex,
}) {
  const volDamped = volatilityAdjustment(lastPrice, geoAdjustedPrice, volDaily);
  const combined =
    technicalPrice * 0.5 + geoAdjustedPrice * 0.35 + volDamped * 0.15;

  return {
    technical: technicalPrice,
    geoAdjusted: geoAdjustedPrice,
    volDamped,
    combined: Number(combined.toFixed(4)),
    weights: { technical: 0.5, geopolitical: 0.35, volatility: 0.15 },
    geoIndex,
  };
}

export async function buildGeopoliticalForecast({
  symbol,
  type,
  series,
  prices,
  windowSize,
  horizonDays,
  methods = 'all',
}) {
  const newsPayload = await fetchGeopoliticalNews({ limit: 50 });
  const news = newsPayload.articles.map((a) =>
    classifyNewsItem(scoreNewsItemAdvanced(a))
  );
  const geoImpact = computeGeopoliticalImpactScore(news);
  const geoIndex = geoImpact.index;

  const forecast = buildForecastResponse(prices, {
    windowSize,
    horizonDays,
    methods,
  });

  const technicalBase = pickTechnicalBase(forecast, prices);
  const lastPrice = prices[prices.length - 1];
  const vol = computeVolatility(prices);
  const risk = await buildRiskProfile(prices);
  const volFactor = risk.bollingerVolatility?.factor ?? lastPrice;

  const geoOnly = forecastWithGeopolitics(symbol, news, technicalBase);
  const geoAdjusted = adjustPriceByImpact(technicalBase, geoIndex) ?? geoOnly.adjustedForecast;
  const volDampedPrice = volatilityAdjustment(lastPrice, geoAdjusted, vol.daily) ?? geoAdjusted;

  const hybrid = hybridForecast({
    prices,
    geoImpactIndex: geoIndex,
    volatilityFactor: volFactor,
    horizonDays,
    windowSize,
  });

  const combined = {
    technical: technicalBase,
    geoAdjusted,
    volDamped: volDampedPrice,
    volFactor,
    combined: hybrid.combined,
    weights: hybrid.weights,
    geoIndex,
  };

  const regime = detectMarketRegime({
    prices,
    sentimentAvg: geoImpact.averageImpact,
    geoImpactIndex: geoIndex,
    volatilityDaily: vol.daily,
    vixLevel: risk.vix?.price,
  });

  const impactSeries = buildGeoImpactSeries(series, geoIndex);

  const horizonCombined = hybrid.forecasts ?? [];

  const sentimentSummary = {
    positive: news.filter((n) => n.sentiment?.label?.includes('positiv')).length,
    negative: news.filter((n) => n.sentiment?.label?.includes('negativ')).length,
    neutral: news.filter((n) => !(n.sentiment?.label || '').match(/positiv|negativ/)).length,
  };

  const alerts = generateIntelligentAlerts({
    prices,
    sentimentSummary,
    geoImpact,
    risk,
    regime,
    hybrid,
  });

  return {
    symbol,
    type,
    news,
    newsMeta: newsPayload,
    geopoliticalIndex: geoIndex,
    geopoliticalImpact: geoImpact,
    sentimentSummary,
    sentimentAggregate: {
      average: geoImpact.averageImpact,
      dimensions: news[0]?.sentiment?.dimensions,
    },
    volatility: vol,
    risk,
    regime,
    hybrid,
    alerts,
    technicalBase,
    baseForecast: technicalBase,
    adjustedForecast: geoAdjusted,
    combinedForecast: combined.combined,
    combined,
    geoOnly,
    impactSeries,
    horizonCombined,
    forecast,
    lastPrice,
  };
}
