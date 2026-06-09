import { fetchGeopoliticalNews } from '../geopolitical/newsFeed.js';
import { classifyNewsItem } from '../geopolitical/eventClassifier.js';
import { scoreNewsItemAdvanced } from '../geopolitical/nlpSentiment.js';

const COMMODITY_KEYWORDS = {
  energy: ['petrolio', 'oil', 'wti', 'brent', 'opec', 'eia', 'gas', 'lng', 'crude', 'barile'],
  agri: ['grano', 'wheat', 'mais', 'corn', 'soia', 'soy', 'usda', 'wasde', 'raccolto', 'drought', 'siccità'],
  metals: ['rame', 'copper', 'nickel', 'lme', 'mina', 'mine'],
  precious: ['oro', 'gold', 'argento', 'silver', 'platino', 'palladio', 'fed', 'inflation'],
  battery: ['litio', 'lithium', 'batter', 'ev ', 'electric vehicle'],
};

export function commodityKeywords(profile) {
  const family = profile?.family ?? 'energy';
  const base = COMMODITY_KEYWORDS[family] ?? [];
  const id = String(profile?.id ?? '').toLowerCase();
  return [...base, id, profile?.name?.toLowerCase()].filter(Boolean);
}

export async function fetchCommodityNews(profile, limit = 20) {
  const payload = await fetchGeopoliticalNews({ limit: 80 });
  const keywords = commodityKeywords(profile);

  const articles = payload.articles
    .map((a) => classifyNewsItem(scoreNewsItemAdvanced(a)))
    .filter((a) => {
      const text = `${a.title} ${a.summary ?? ''}`.toLowerCase();
      return keywords.some((k) => text.includes(k));
    })
    .slice(0, limit);

  const sentiment =
    articles.length > 0
      ? Number(
          (
            articles.reduce((s, a) => s + (a.sentiment?.normalized ?? 0), 0) / articles.length
          ).toFixed(3)
        )
      : 0;

  return {
    articles,
    sentiment,
    count: articles.length,
    sources: payload.sources ?? [],
  };
}
