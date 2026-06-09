import { advancedSentimentScore, sentimentScore } from './sentiment.js';
import { computeGeopoliticalImpactScore } from './impactScore.js';

/** §2 — Indice geopolitico unificato (stessa scala di impactScore). */
export function geopoliticalIndex(newsArray) {
  if (!newsArray?.length) return 0;
  const hasNormalized = newsArray.some((n) => n.sentiment?.normalized != null);
  if (hasNormalized || newsArray.some((n) => n.event)) {
    return computeGeopoliticalImpactScore(newsArray).index;
  }
  const sumNorm = newsArray.reduce((s, n) => {
    if (n.sentiment?.normalized != null) return s + n.sentiment.normalized;
    if (n.sentiment?.weightedScore != null) return s + n.sentiment.weightedScore / 3;
    return s + sentimentScore(n.title || n.description || '') / 3;
  }, 0);
  return Math.round(sumNorm * 3);
}

/** Indice normalizzato con media e deviazione per confronti. */
export function geopoliticalIndexAdvanced(newsArray) {
  if (!newsArray?.length) {
    return { index: 0, averageNormalized: 0, articleCount: 0 };
  }

  const scored = newsArray.map((n) => {
    const s =
      n.sentiment?.normalized ??
      advancedSentimentScore([n.title, n.description].filter(Boolean).join(' ')).normalized;
    return s;
  });

  const sum = scored.reduce((a, b) => a + b, 0);
  const avg = sum / scored.length;
  const index = Math.round(avg * newsArray.length * 3);

  return {
    index,
    averageNormalized: Number(avg.toFixed(3)),
    articleCount: newsArray.length,
  };
}

/** §3 — Aggiustamento prezzo: 1% per punto indice. */
export function adjustForecast(basePrice, geoIndex) {
  if (basePrice == null || !Number.isFinite(basePrice)) return null;
  const factor = 1 + geoIndex * 0.01;
  return basePrice * factor;
}

/** §4 */
export function forecastWithGeopolitics(symbol, newsArray, baseForecastPrice) {
  const geoIndex = geopoliticalIndex(newsArray);
  const adjusted = adjustForecast(baseForecastPrice, geoIndex);

  return {
    symbol,
    baseForecast: baseForecastPrice,
    geopoliticalIndex: geoIndex,
    adjustedForecast: adjusted,
  };
}
