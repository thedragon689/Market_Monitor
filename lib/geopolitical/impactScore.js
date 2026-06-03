import { adjustForecast } from './geoForecast.js';

/** Aggiusta il prezzo del 1% per punto di indice geopolitico. */
export function adjustPriceByImpact(basePrice, geoIndex) {
  return adjustForecast(basePrice, geoIndex);
}

function articleImpact(news) {
  const normalized = news.sentiment?.normalized ?? 0;
  const event = news.event;
  let impact = normalized * 3;

  if (event?.primary) {
    const sign = event.eventSign ?? event.primary.sign ?? 0;
    const weight = event.eventWeight ?? event.primary.weight ?? 1;
    impact += sign * weight * 0.35;
  }

  return Number(impact.toFixed(4));
}

/**
 * Calcola indice geopolitico aggregato e impatti per articolo.
 * @param {Array} newsArray articoli già classificati (event + sentiment)
 */
export function computeGeopoliticalImpactScore(newsArray) {
  const articles = (newsArray || []).map((n) => ({
    ...n,
    impactDetail: { impact: articleImpact(n) },
  }));

  if (!articles.length) {
    return {
      index: 0,
      averageImpact: 0,
      articleCount: 0,
      topEvents: [],
    };
  }

  const impacts = articles.map((a) => a.impactDetail.impact);
  const averageImpact = impacts.reduce((a, b) => a + b, 0) / impacts.length;

  const sumNorm = articles.reduce((s, n) => s + (n.sentiment?.normalized ?? 0), 0);
  const index = Math.round((sumNorm / articles.length) * articles.length * 3);

  const topEvents = articles
    .filter((n) => n.event?.primary || Math.abs(n.impactDetail.impact) > 0.15)
    .sort((a, b) => Math.abs(b.impactDetail.impact) - Math.abs(a.impactDetail.impact))
    .slice(0, 10)
    .map((n) => ({
      impact: n.impactDetail.impact,
      event: n.event?.primary?.label ?? 'Notizia',
      title: n.title,
      source: n.source,
    }));

  return {
    index,
    averageImpact: Number(averageImpact.toFixed(4)),
    articleCount: articles.length,
    topEvents,
  };
}
