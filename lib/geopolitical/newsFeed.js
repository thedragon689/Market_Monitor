import axios from 'axios';

const FEEDS = [
  {
    source: 'ANSA',
    sourceId: 'ansa',
    url: 'https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml',
  },
  {
    source: 'BBC',
    sourceId: 'bbc',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  },
  {
    source: 'Guardian',
    sourceId: 'guardian',
    url: 'https://www.theguardian.com/world/rss',
  },
];

const GEO_KEYWORDS = [
  'guerra', 'war', 'conflitto', 'conflict', 'sanzion', 'sanction', 'nato', 'ucrain',
  'ukraine', 'russia', 'israele', 'israel', 'gaza', 'iran', 'cina', 'china', 'taiwan',
  'petrolio', 'oil', 'opec', 'fed', 'bce', 'inflazione', 'inflation', 'elezion', 'election',
  'geopolit', 'diplomaz', 'embargo', 'trade', 'commercio', 'mercato', 'market', 'crisi',
];

function decodeEntities(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .trim();
}

function parseRss(xml, meta) {
  const items = [];
  const blocks = String(xml).split(/<item[\s>]/i).slice(1);

  for (const block of blocks) {
    const title = decodeEntities(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const link = decodeEntities(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]);
    const description = decodeEntities(
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]
    );
    const pubDate =
      decodeEntities(block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]) ||
      decodeEntities(block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1]);

    if (!title) continue;

    items.push({
      title,
      link,
      description: description || '',
      pubDate: pubDate || null,
      source: meta.source,
      sourceId: meta.sourceId,
    });
  }

  return items;
}

function isGeoRelevant(article) {
  const text = [article.title, article.description].join(' ').toLowerCase();
  return GEO_KEYWORDS.some((k) => text.includes(k));
}

async function fetchFeed(feed) {
  const { data } = await axios.get(feed.url, {
    timeout: 12_000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketMonitor/1.0)' },
    responseType: 'text',
    transformResponse: [(r) => r],
  });
  return parseRss(data, feed);
}

/**
 * @param {{ limit?: number, filterGeo?: boolean }} options
 */
export async function fetchGeopoliticalNews({ limit = 40, filterGeo = true } = {}) {
  const errors = [];
  const all = [];

  await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const items = await fetchFeed(feed);
        all.push(...items);
      } catch (err) {
        errors.push({ source: feed.source, error: err.message });
        console.warn(`Feed ${feed.source}:`, err.message);
      }
    })
  );

  let articles = all;
  if (filterGeo) {
    articles = articles.filter(isGeoRelevant);
    if (!articles.length && all.length) articles = all;
  }

  articles.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  const seen = new Set();
  const deduped = [];
  for (const a of articles) {
    const key = a.title?.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
    if (deduped.length >= limit) break;
  }

  return {
    articles: deduped,
    count: deduped.length,
    fetchedAt: new Date().toISOString(),
    sources: FEEDS.map((f) => f.source),
    errors: errors.length ? errors : undefined,
  };
}
