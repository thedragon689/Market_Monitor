import { generateIntelligentAlerts } from '../alerts/intelligentAlerts.js';
import { buildForecastResponse } from '../forecastApi.js';
import { hybridForecast } from '../forecast/hybridModel.js';
import { scoreNewsItemAdvanced } from '../geopolitical/nlpSentiment.js';
import { classifyNewsItem } from '../geopolitical/eventClassifier.js';
import { computeGeopoliticalImpactScore } from '../geopolitical/impactScore.js';
import { fetchGeopoliticalNews } from '../geopolitical/newsFeed.js';
import { buildGeoImpactSeries } from '../geopolitical/combinedForecast.js';
import { polynomialForecast } from '../ml/polynomialForecast.js';
import { randomForestPredict } from '../ml/ensembleForest.js';
import { computeMarketCorrelations, correlationHeatmapCells } from '../market/correlations.js';
import { detectMarketRegime } from '../market/regimeDetection.js';
import { buildRiskProfile } from '../risk/riskEngine.js';
import { loadMarketData } from '../yahoo.js';

function enrichArticles(articles) {
  return articles.map((a) => classifyNewsItem(scoreNewsItemAdvanced(a)));
}

function aggregateSentiment(articles) {
  if (!articles.length) return { average: 0, dimensions: {} };
  const dims = {};
  let sum = 0;
  for (const a of articles) {
    sum += a.sentiment?.normalized ?? 0;
    for (const [k, v] of Object.entries(a.sentiment?.dimensions ?? {})) {
      dims[k] = (dims[k] || 0) + v;
    }
  }
  const n = articles.length;
  for (const k of Object.keys(dims)) dims[k] = Number((dims[k] / n).toFixed(3));
  return { average: Number((sum / n).toFixed(3)), dimensions: dims };
}

export async function buildMarketIntelligence({
  symbol,
  type = 'stock',
  series,
  prices,
  windowSize = 5,
  horizonDays = 5,
  methods = 'all',
  includeCorrelations = true,
}) {
  const newsPayload = await fetchGeopoliticalNews({ limit: 50 });
  const news = enrichArticles(newsPayload.articles);
  const geoImpact = computeGeopoliticalImpactScore(news);
  const sentimentAgg = aggregateSentiment(news);

  let benchSeries = null;
  let benchmark = 'SPY';
  if (type === 'stock' || type === 'national') {
    benchmark = 'SPY';
    try {
      const spy = await loadMarketData('SPY', 'stock');
      benchSeries = spy.series;
    } catch {
      /* optional */
    }
  } else if (type === 'crypto') {
    benchmark = 'BTC-USD';
    try {
      const btc = await loadMarketData('BTC-USD', 'crypto');
      benchSeries = btc.series;
    } catch {
      /* optional */
    }
  } else if (type === 'commodity') {
    benchmark = 'WTI';
    try {
      const bench = await loadMarketData('WTI', 'commodity');
      benchSeries = bench.series;
    } catch {
      /* optional */
    }
  } else if (type === 'precious') {
    benchmark = 'XAUUSD';
    try {
      const bench = await loadMarketData('XAUUSD', 'precious');
      benchSeries = bench.series;
    } catch {
      /* optional */
    }
  }

  const risk = await buildRiskProfile(prices, {
    assetSeries: series,
    benchSeries,
    benchmark,
  });
  const forecast = buildForecastResponse(prices, { windowSize, horizonDays, methods });
  const polyRaw = polynomialForecast(prices, 2, horizonDays);
  const poly = polyRaw
    ? {
        ...polyRaw,
        label: 'Regressione polinomiale',
        formula: 'y = a + bx + cx²',
        description: 'Trend quadratico su tutta la serie storica.',
        nextDay: polyRaw.forecasts?.[0]?.price ?? null,
      }
    : null;

  const rfRaw = randomForestPredict(
    prices,
    {
      sentiment: sentimentAgg.average,
      volatility: risk.atr?.pctOfPrice ? risk.atr.pctOfPrice / 100 : 0,
      geoImpact: geoImpact.index / 10,
    },
    horizonDays
  );
  const rf = rfRaw
    ? {
        ...rfRaw,
        label: 'Random Forest',
        formula: `RF(${rfRaw.trees} alberi)`,
        description:
          'Ensemble su rendimenti, SMA ratio, sentiment, volatilità e geo.',
        nextDay: rfRaw.nextPrice,
      }
    : null;

  const volFactor = risk.bollingerVolatility?.factor ?? prices.at(-1);
  const hybrid = hybridForecast({
    prices,
    geoImpactIndex: geoImpact.index,
    volatilityFactor: volFactor,
    horizonDays,
  });

  const regime = detectMarketRegime({
    prices,
    sentimentAvg: sentimentAgg.average,
    geoImpactIndex: geoImpact.index,
    volatilityDaily: risk.atr?.pctOfPrice ? risk.atr.pctOfPrice / 100 : 0,
    vixLevel: risk.vix?.price,
  });

  let correlationPayload = { pairs: [], macro: [], asset: [], updatedAt: null };
  if (includeCorrelations !== false) {
    try {
      correlationPayload = await computeMarketCorrelations({ symbol, type });
    } catch {
      correlationPayload = { pairs: [], macro: [], asset: [], updatedAt: null };
    }
  }

  const correlations = correlationPayload.pairs ?? [];

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

  const impactSeries = buildGeoImpactSeries(series, geoImpact.index);

  const sentimentTimeline = news
    .filter((n) => n.pubDate)
    .slice(0, 20)
    .map((n) => ({
      date: n.pubDate,
      title: n.title,
      source: n.source,
      normalized: n.sentiment?.normalized ?? 0,
      event: n.event?.primary?.label ?? null,
      impact: n.impactDetail?.impact ?? 0,
    }));

  return {
    symbol,
    type,
    news,
    newsMeta: newsPayload,
    geopolitical: {
      impactScore: geoImpact,
      index: geoImpact.index,
      sentiment: sentimentAgg,
      impactSeries,
      sentimentTimeline,
    },
    risk,
    regime,
    forecast,
    ml: {
      polynomial: poly,
      randomForest: rf,
    },
    hybrid,
    correlations,
    correlationMeta: {
      macro: correlationPayload.macro,
      asset: correlationPayload.asset,
      updatedAt: correlationPayload.updatedAt,
    },
    heatmap: correlationHeatmapCells(correlations),
    alerts,
    lastPrice: prices[prices.length - 1],
  };
}
