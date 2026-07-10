import { ALL_LEXICONS } from './lexicons/financialLexicon.js';
import { sentimentScore } from './sentiment.js';

/** Peso per fonte (Guardian/Reuters > BBC > ANSA > altro). */
export const SOURCE_WEIGHTS = {
  guardian: 1.45,
  reuters: 1.45,
  bbc: 1.2,
  ansa: 1.0,
  default: 0.85,
};

/** Regole frase → override / boost (analisi per frase). */
const PHRASE_RULES = [
  {
    id: 'tension_stable',
    pattern: /tensione\s+cresce\s+ma\s+.{0,60}(stabili|stabile|calmi|calmo)/i,
    score: 0,
    label: 'neutro',
    note: 'Contrasto tensione / stabilità mercati',
  },
  {
    id: 'historic_trade_deal',
    pattern: /accordo\s+commerciale\s+storico|historic(al)?\s+trade\s+deal/i,
    score: 2.2,
    label: 'molto positivo',
  },
  {
    id: 'armed_conflict_prob',
    pattern: /probabilit[aà].{0,40}(conflitto\s+armato|guerra)|likelihood.{0,40}(war|armed\s+conflict)/i,
    score: -2.8,
    label: 'molto negativo',
  },
  {
    id: 'ceasefire',
    pattern: /tregua|cessate\s+il\s+fuoco|ceasefire|armistice/i,
    score: 1.8,
    label: 'positivo',
  },
  {
    id: 'rate_hike_fear',
    pattern: /rialzo\s+(dei\s+)?tassi|rate\s+hike|hawkish\s+fed|bce\s+rialza/i,
    score: -1.2,
    label: 'rischio',
    emotions: { fear: 0.5, uncertainty: 0.4 },
  },
  {
    id: 'inflation_surge',
    pattern: /inflazione\s+(sale|alta|record)|inflation\s+(surge|soar|spike)/i,
    score: -1.5,
    label: 'negativo',
    emotions: { fear: 0.3, uncertainty: 0.5 },
  },
];

const NEGATORS = ['non', 'not', 'no', 'senza', 'without', 'mai', 'never', 'né', 'neither'];
const INTENSIFIERS = ['molto', 'estremamente', 'grave', 'severa', 'severe', 'drastic', 'massiccio', 'sharp'];

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function matchLexicon(tokens, words) {
  const hits = [];
  const set = new Set(tokens);
  for (const w of words) {
    const stem = w.toLowerCase();
    if (set.has(stem) || tokens.some((t) => t.startsWith(stem) || stem.startsWith(t))) {
      hits.push(stem);
    }
  }
  return hits;
}

function scoreLexicons(text) {
  const tokens = tokenize(text);
  const categories = {};
  let lmScore = 0;

  for (const [key, words] of Object.entries(ALL_LEXICONS)) {
    const hits = matchLexicon(tokens, words);
    if (!hits.length) continue;
    categories[key] = hits;

    if (key.includes('negative') || key.includes('fear') || key.includes('anger') || key === 'lm_litigious') {
      lmScore -= hits.length * (key.includes('lm_') ? 0.8 : 0.5);
    }
    if (key.includes('positive') || key.includes('joy') || key.includes('trust')) {
      lmScore += hits.length * 0.7;
    }
    if (key.includes('uncertainty') || key.includes('volatility')) {
      lmScore -= hits.length * 0.4;
    }
  }

  return { categories, tokens, lmScore };
}

function applyPhraseRules(text) {
  const matches = [];
  let phraseScore = 0;
  const emotionBoost = {};

  for (const rule of PHRASE_RULES) {
    if (rule.pattern.test(text)) {
      phraseScore += rule.score;
      matches.push({ id: rule.id, label: rule.label, score: rule.score, note: rule.note });
      if (rule.emotions) {
        for (const [e, v] of Object.entries(rule.emotions)) {
          emotionBoost[e] = (emotionBoost[e] || 0) + v;
        }
      }
    }
  }

  return { matches, phraseScore, emotionBoost };
}

function negationFactor(text) {
  const t = text.toLowerCase();
  return NEGATORS.some((n) => {
    const i = t.indexOf(n);
    return i >= 0 && i < 50;
  })
    ? 0.55
    : 1;
}

function intensifierFactor(text) {
  const t = text.toLowerCase();
  return INTENSIFIERS.some((w) => t.includes(w)) ? 1.2 : 1;
}

/** Analisi NLP locale completa. */
export function financialNlpSentiment(text, { sourceId } = {}) {
  const raw = String(text || '');
  const basic = sentimentScore(raw);
  const lex = scoreLexicons(raw);
  const phrases = applyPhraseRules(raw);
  const negF = negationFactor(raw);
  const intF = intensifierFactor(raw);

  const sourceWeight = SOURCE_WEIGHTS[sourceId?.toLowerCase()] ?? SOURCE_WEIGHTS.default;

  let composite =
    (basic * 0.15 + lex.lmScore * 0.45 + phrases.phraseScore * 0.4) * negF * intF;
  composite *= sourceWeight;

  const normalized = Math.max(-1, Math.min(1, Math.tanh(composite / 4)));

  const emotions = {};
  for (const [key, hits] of Object.entries(lex.categories)) {
    if (key.startsWith('nrc_')) {
      const emo = key.replace('nrc_', '');
      emotions[emo] = (emotions[emo] || 0) + hits.length * 0.25;
    }
  }
  for (const [e, v] of Object.entries(phrases.emotionBoost)) {
    emotions[e] = (emotions[e] || 0) + v;
  }

  const dimensions = {
    fear: (emotions.fear || 0) + (lex.categories.lm_negative?.length ? 0.2 : 0),
    uncertainty: (emotions.anticipation || 0) + (lex.categories.lm_uncertainty?.length || 0) * 0.3,
    optimism: (emotions.joy || 0) + (emotions.trust || 0) + (lex.categories.lm_positive?.length || 0) * 0.25,
    risk: (lex.categories.lm_risk?.length || 0) * 0.35 + (lex.categories.lm_litigious?.length || 0) * 0.2,
    volatility: (lex.categories.lm_volatility?.length || 0) * 0.4,
  };

  let label = 'neutro';
  if (phrases.matches.some((m) => m.label === 'neutro')) label = 'neutro';
  else if (phrases.matches.some((m) => m.label === 'molto positivo')) label = 'molto positivo';
  else if (phrases.matches.some((m) => m.label === 'molto negativo')) label = 'molto negativo';
  else if (normalized >= 0.35) label = 'positivo';
  else if (normalized <= -0.35) label = 'negativo';
  else if (normalized > 0.12) label = 'leggermente positivo';
  else if (normalized < -0.12) label = 'leggermente negativo';

  return {
    score: basic,
    weightedScore: Number(composite.toFixed(3)),
    normalized: Number(normalized.toFixed(3)),
    label,
    sourceWeight,
    lexiconHits: lex.categories,
    phraseMatches: phrases.matches,
    emotions,
    dimensions,
    engines: ['basic', 'lm', 'harvard', 'nrc', 'phrases'],
  };
}

export function scoreNewsItemAdvanced(news) {
  const text = [news.title, news.description].filter(Boolean).join(' ');
  const sentiment = financialNlpSentiment(text, { sourceId: news.sourceId });
  return { ...news, sentiment };
}

export function getSourceWeight(sourceId) {
  return SOURCE_WEIGHTS[sourceId?.toLowerCase()] ?? SOURCE_WEIGHTS.default;
}
