import { advancedSentimentScore, sentimentScore } from './sentiment.js';

/** §2 — Indice geopolitico dalla somma dei sentiment sui titoli. */
export function geopoliticalIndex(newsArray) {
  if (!newsArray?.length) return 0;
  return newsArray
    .map((n) => {
      if (n.sentiment?.score != null) return n.sentiment.score;
      if (n.sentiment?.weightedScore != null) return Math.round(n.sentiment.weightedScore);
      return sentimentScore(n.title || n.description || '');
    })
    .reduce((a, b) => a + b, 0);
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
