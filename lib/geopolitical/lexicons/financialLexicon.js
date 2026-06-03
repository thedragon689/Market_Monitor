/**
 * Lessici ispirati a Loughran–McDonald, Harvard IV e NRC (subset curato, uso locale).
 * Categorie LM: negative, positive, uncertainty, litigious, constraining, risk, volatility.
 * NRC: fear, anger, trust, anticipation, sadness, joy, surprise, disgust.
 */

export const LM_NEGATIVE = [
  'loss', 'losses', 'decline', 'fall', 'fell', 'drop', 'plunge', 'crash', 'default', 'bankruptcy',
  'perdita', 'perdite', 'crollo', 'ribasso', 'fallimento', 'default', 'crisi', 'crisis',
  'recession', 'recessione', 'downgrade', 'downgrades', 'impairment', 'writedown',
];

export const LM_POSITIVE = [
  'profit', 'profits', 'growth', 'gain', 'gains', 'surge', 'rally', 'upgrade', 'beat',
  'utile', 'utili', 'crescita', 'rialzo', 'record', 'ripresa', 'recovery', 'expansion',
  'dividend', 'dividendo', 'outperform', 'strong', 'robust', 'solid',
];

export const LM_UNCERTAINTY = [
  'uncertain', 'uncertainty', 'volatile', 'volatility', 'risk', 'risks', 'may', 'might',
  'incerto', 'incertezza', 'volatile', 'volatilità', 'rischio', 'rischi', 'forse', 'possibile',
  'unknown', 'unpredictable', 'imprevedibile', 'fluctuat', 'oscill',
];

export const LM_LITIGIOUS = [
  'lawsuit', 'litigation', 'fraud', 'investigation', 'probe', 'subpoena', 'fine', 'penalty',
  'causa', 'frode', 'indagine', 'inchiesta', 'multa', 'sanzione', 'penale',
];

export const LM_CONSTRAINING = [
  'constraint', 'restrict', 'limit', 'limited', 'barrier', 'embargo', 'sanction', 'sanctions',
  'restrizione', 'limite', 'vincolo', 'embargo', 'sanzioni', 'blocco',
];

export const LM_RISK = [
  'risk', 'risks', 'exposure', 'hedge', 'stress', 'tail', 'contagion', 'systemic',
  'rischio', 'esposizione', 'stress', 'contagio', 'sistemico', 'default',
];

export const LM_VOLATILITY = [
  'volatile', 'volatility', 'swing', 'turbulent', 'turmoil', 'spike', 'whiplash',
  'volatilità', 'turbolenza', 'oscillazione', 'sbalzo', 'impennata',
];

export const HARVARD_POSITIVE = [
  'good', 'great', 'excellent', 'positive', 'success', 'successful', 'win', 'winning',
  'buono', 'ottimo', 'positivo', 'successo', 'vittoria', 'favorevole',
];

export const HARVARD_NEGATIVE = [
  'bad', 'poor', 'negative', 'fail', 'failed', 'failure', 'lose', 'losing', 'worst',
  'cattivo', 'pessimo', 'negativo', 'fallito', 'fallimento', 'peggio',
];

export const NRC_EMOTIONS = {
  fear: ['fear', 'afraid', 'panic', 'paura', 'panico', 'timore', 'terror', 'terrore', 'ansia', 'anxiety'],
  anger: ['anger', 'angry', 'outrage', 'rabbia', 'furioso', 'indignazione', 'ira'],
  trust: ['trust', 'confidence', 'fiducia', 'confidenza', 'credibilità', 'reliable'],
  anticipation: ['expect', 'forecast', 'anticip', 'attesa', 'previsto', 'prospettiva'],
  sadness: ['sad', 'grief', 'triste', 'dolore', 'lutto', 'mourning'],
  joy: ['joy', 'happy', 'celebrat', 'gioia', 'felice', 'festeggi'],
  surprise: ['surprise', 'shock', 'unexpected', 'sorpresa', 'shock', 'inaspettat'],
  disgust: ['disgust', 'scandal', 'disgusto', 'scandalo', 'vergogna'],
};

export const LEXICON_META = {
  lm: ['negative', 'positive', 'uncertainty', 'litigious', 'constraining', 'risk', 'volatility'],
  harvard: ['positive', 'negative'],
  nrc: Object.keys(NRC_EMOTIONS),
};

export const ALL_LEXICONS = {
  lm_negative: LM_NEGATIVE,
  lm_positive: LM_POSITIVE,
  lm_uncertainty: LM_UNCERTAINTY,
  lm_litigious: LM_LITIGIOUS,
  lm_constraining: LM_CONSTRAINING,
  lm_risk: LM_RISK,
  lm_volatility: LM_VOLATILITY,
  harvard_positive: HARVARD_POSITIVE,
  harvard_negative: HARVARD_NEGATIVE,
  ...Object.fromEntries(
    Object.entries(NRC_EMOTIONS).map(([k, v]) => [`nrc_${k}`, v])
  ),
};
