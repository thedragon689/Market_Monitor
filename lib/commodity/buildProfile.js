import { buildForecastResponse } from '../forecastApi.js';
import { arimaForecast } from '../forecast/arimaModel.js';
import { lstmForecast } from '../forecast/lstmModel.js';
import { prophetForecast } from '../forecast/prophetModel.js';
import { computeCommodityIndicators } from '../indicators.js';
import { computeMarketCorrelations } from '../market/correlations.js';
import { isMetalType } from '../marketType.js';
import { getCommodityProfile } from '../commodityRegistry.js';
import { buildForwardCurve } from './forwardCurve.js';
import { buildFundamentalsContext } from './fundamentals.js';
import { fetchMacroSnapshot, macroNarrative } from './macroFactors.js';
import { fetchCommodityNews } from './newsSentiment.js';
import { fetchYahooCommodityChart } from './yahooMarket.js';
import { historicalVolatility } from './volatility.js';

export async function buildCommodityProfile({
  symbol,
  type,
  series = [],
  quote = null,
  windowSize = 20,
  horizonDays = 5,
}) {
  if (!isMetalType(type)) {
    return { error: 'Profilo commodity disponibile solo per precious e commodity' };
  }

  const profile = getCommodityProfile(symbol, type);
  if (!profile) {
    return { error: `Commodity non configurata: ${symbol}` };
  }

  const prices = series.map((p) => p.price).filter((p) => Number.isFinite(p));
  const yahooSym = profile.yahooSpot;

  let marketData = null;
  try {
    marketData = await fetchYahooCommodityChart(yahooSym);
  } catch {
    /* usa serie cache */
  }

  const spotPrice = quote?.price ?? marketData?.quote?.price ?? prices.at(-1) ?? null;
  const enrichedQuote = {
    symbol,
    spot: spotPrice,
    price: spotPrice,
    change: quote?.change ?? marketData?.quote?.change ?? null,
    changePercent: quote?.changePercent ?? marketData?.quote?.changePercent ?? null,
    high: marketData?.quote?.high ?? null,
    low: marketData?.quote?.low ?? null,
    volume: marketData?.quote?.volume ?? null,
    openInterest: marketData?.quote?.openInterest ?? null,
    currency: quote?.currency ?? marketData?.quote?.currency ?? 'USD',
    asOf: quote?.asOf ?? marketData?.quote?.asOf ?? null,
    source: quote?.source ?? 'yahoo-futures',
    proxy: profile.proxy ?? 'Futures Yahoo (front month)',
  };

  const [forwardCurve, macro, news, correlations] = await Promise.all([
    buildForwardCurve(profile, spotPrice, prices),
    fetchMacroSnapshot(['DXY', 'SPY', 'TIP']),
    fetchCommodityNews(profile, 15),
    prices.length >= 10
      ? computeMarketCorrelations({ symbol, type }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const futures = forwardCurve?.points ?? [];
  const indicators = computeCommodityIndicators(prices);
  const histVol20 = historicalVolatility(prices, 20);
  const histVol30 = historicalVolatility(prices, 30);

  const forecastClassic = buildForecastResponse(prices, {
    windowSize,
    horizonDays,
    methods: 'all',
  });

  const models = {
    arima: arimaForecast(prices, horizonDays, windowSize),
    lstm: lstmForecast(prices, horizonDays, windowSize),
    prophet: prophetForecast(prices, horizonDays),
    hybrid: null,
  };

  if (models.arima?.nextPrice != null && models.lstm?.nextPrice != null) {
    models.hybrid = {
      nextPrice: Number(((models.arima.nextPrice + models.lstm.nextPrice) / 2).toFixed(6)),
      formula: 'Ibrido ARIMA + LSTM (media)',
      arima: models.arima.nextPrice,
      lstm: models.lstm.nextPrice,
    };
  }

  return {
    symbol,
    type,
    profile: {
      id: profile.id,
      name: profile.name,
      family: profile.family,
      unit: profile.unit,
      pricingKind: profile.pricingKind,
      hint: profile.hint,
      proxy: profile.proxy,
    },
    quote: enrichedQuote,
    futures: {
      points: futures,
      structure: forwardCurve?.structure ?? null,
      structureLabel: forwardCurve?.structureLabel ?? null,
      interpretation: forwardCurve?.interpretation ?? null,
    },
    market: {
      spot: spotPrice,
      volume: enrichedQuote.volume,
      openInterest: enrichedQuote.openInterest,
      changePercent: enrichedQuote.changePercent,
      dayHigh: enrichedQuote.high,
      dayLow: enrichedQuote.low,
      historicalVolatility: histVol20,
      historicalVolatility30: histVol30,
    },
    indicators,
    macro: {
      factors: macro,
      narrative: macroNarrative(macro, profile),
    },
    fundamentals: buildFundamentalsContext(profile),
    geopolitical: {
      keywords: profile.geo ?? [],
      climateSensitive: Boolean(profile.climate),
    },
    correlations: correlations?.pairs ?? correlations ?? null,
    forecasts: forecastClassic,
    models,
    news,
    dataNotes: [
      'Spot = front-month futures Yahoo salvo diversa indicazione.',
      forwardCurve?.points?.some((p) => p.synthetic)
        ? 'Scadenze 1M/3M/6M parzialmente sintetiche quando non disponibili contratti distinti.'
        : null,
      'Report EIA/USDA/LME: riferimenti strutturati; integrazione API live opzionale.',
    ].filter(Boolean),
  };
}
