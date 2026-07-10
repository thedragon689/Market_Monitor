import axios from 'axios';

const UA = 'MarketMonitor/1.0 (fintech; sentiment)';

async function fetchSubreddit(name, limit = 8) {
  const url = `https://www.reddit.com/r/${name}/hot.json`;
  const { data } = await axios.get(url, {
    params: { limit },
    timeout: 10_000,
    headers: { 'User-Agent': UA },
  });
  return (data?.data?.children ?? []).map((c) => {
    const p = c.data;
    return {
      id: p.id,
      title: p.title,
      subreddit: p.subreddit,
      score: p.score,
      comments: p.num_comments,
      url: `https://reddit.com${p.permalink}`,
      createdAt: new Date(p.created_utc * 1000).toISOString(),
      source: 'reddit',
    };
  });
}

/** Feed sentiment social — Reddit pubblico (stocks, investing, cryptocurrency). */
export async function fetchSocialSentiment({ limit = 20 } = {}) {
  const subs =
    process.env.SOCIAL_REDDIT_SUBS?.split(',').map((s) => s.trim()).filter(Boolean) ||
    ['stocks', 'investing', 'wallstreetbets', 'cryptocurrency'];

  const chunks = await Promise.all(
    subs.map((sub) =>
      fetchSubreddit(sub, Math.ceil(limit / subs.length)).catch(() => [])
    )
  );

  const posts = chunks
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const tickers = posts
    .flatMap((p) => [...(p.title.match(/\$[A-Z]{1,5}/g) || [])])
    .map((t) => t.slice(1));

  const mentions = {};
  for (const t of tickers) mentions[t] = (mentions[t] || 0) + 1;

  const topMentions = Object.entries(mentions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symbol, count]) => ({ symbol, count }));

  return {
    posts,
    topMentions,
    sources: subs,
    count: posts.length,
  };
}
