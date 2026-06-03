/** Sentiment base (toolkit §1) + motore avanzato IT/EN. */

const POSITIVE_BASIC = [
  'accordo',
  'crescita',
  'pace',
  'stabile',
  'espansione',
  'ripresa',
  'deal',
  'peace',
  'growth',
  'stable',
  'recovery',
  'ceasefire',
  'tregua',
  'alliance',
  'alleanza',
];

const NEGATIVE_BASIC = [
  'guerra',
  'crisi',
  'sanzioni',
  'tensione',
  'attacco',
  'crollo',
  'inflazione',
  'war',
  'crisis',
  'sanctions',
  'tension',
  'attack',
  'collapse',
  'inflation',
  'missile',
  'bomba',
  'invasion',
  'invasione',
  'raid',
  'embargo',
];

const POSITIVE_WEIGHTED = {
  accordo: 1.5,
  pace: 2,
  peace: 2,
  ceasefire: 2,
  tregua: 2,
  ripresa: 1.2,
  recovery: 1.2,
  stabil: 1,
  stable: 1,
};

const NEGATIVE_WEIGHTED = {
  guerra: 2.5,
  war: 2.5,
  invas: 2.2,
  invasion: 2.2,
  attacco: 2,
  attack: 2,
  sanzion: 1.8,
  sanctions: 1.8,
  crisi: 1.5,
  crisis: 1.5,
  crollo: 1.8,
  collapse: 1.8,
  nucleare: 2,
  nuclear: 2,
};

const INTENSIFIERS = ['grave', 'severa', 'severe', 'sharp', 'drastic', 'massiccio', 'massive'];
const NEGATORS = ['non', 'no', 'not', 'senza', 'without', 'mai', 'never'];

export function sentimentScore(text) {
  const positive = POSITIVE_BASIC;
  const negative = NEGATIVE_BASIC;

  let score = 0;
  const t = String(text || '').toLowerCase();

  for (const w of positive) if (t.includes(w)) score++;
  for (const w of negative) if (t.includes(w)) score--;

  return score;
}

function countWeighted(t, dict) {
  let sum = 0;
  const hits = [];
  for (const [stem, weight] of Object.entries(dict)) {
    if (t.includes(stem)) {
      sum += weight;
      hits.push(stem);
    }
  }
  return { sum, hits };
}

/** Sentiment avanzato: pesi, intensificatori, negazione semplice. */
export function advancedSentimentScore(text) {
  const t = String(text || '').toLowerCase();
  const basic = sentimentScore(text);

  const pos = countWeighted(t, POSITIVE_WEIGHTED);
  const neg = countWeighted(t, NEGATIVE_WEIGHTED);

  let weighted = pos.sum - neg.sum;
  const intensifier = INTENSIFIERS.some((w) => t.includes(w)) ? 1.25 : 1;
  weighted *= intensifier;

  const negated =
    NEGATORS.some((n) => {
      const idx = t.indexOf(n);
      if (idx < 0) return false;
      const slice = t.slice(idx, idx + 40);
      return neg.hits.some((h) => slice.includes(h)) || pos.hits.some((h) => slice.includes(h));
    });
  if (negated) weighted *= -0.5;

  const raw = basic * 0.4 + weighted * 0.6;
  const normalized = Math.max(-1, Math.min(1, Math.tanh(raw / 3)));

  let label = 'neutro';
  if (normalized >= 0.35) label = 'positivo';
  else if (normalized <= -0.35) label = 'negativo';
  else if (normalized > 0.1) label = 'leggermente positivo';
  else if (normalized < -0.1) label = 'leggermente negativo';

  return {
    score: basic,
    weightedScore: Number(weighted.toFixed(3)),
    normalized: Number(normalized.toFixed(3)),
    label,
    positiveHits: pos.hits,
    negativeHits: neg.hits,
  };
}

export function scoreNewsItem(news) {
  const text = [news.title, news.description].filter(Boolean).join(' ');
  const sentiment = advancedSentimentScore(text);
  return { ...news, sentiment };
}
