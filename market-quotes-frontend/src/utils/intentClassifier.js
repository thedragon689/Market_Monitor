import { INTENT_DATASET, INTENTS } from '../data/intentDataset.js';

/**
 * Classificatore di intent locale (offline), addestrato sul dataset etichettato.
 *
 * Modello: Naive Bayes multinomiale con smoothing di Laplace. Le feature sono
 * i token di parola ("w:parola") più i char 3-grammi ("#gram"), che rendono il
 * modello robusto ai typo (es. "grfico"→"grafico", "indcatori"→"indicatori").
 * Espone `classifyIntent` (single-label) e `detectMultiIntent` (2–3 intent).
 */

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Token di parola alfanumerici (accenti già rimossi). */
function wordTokens(norm) {
  return norm.replace(/[^a-z0-9]+/g, ' ').match(/[a-z0-9]+/g) || [];
}

/** Char n-grammi con padding di confine, per tolleranza ai refusi. */
function charNgrams(token, n = 3) {
  const padded = `^${token}$`;
  const grams = [];
  for (let i = 0; i + n <= padded.length; i++) grams.push(`#${padded.slice(i, i + n)}`);
  return grams;
}

/** Estrae feature (parole + char-3grammi) e la lista di parole grezze. */
function extractFeatures(text) {
  const norm = normalize(text);
  const words = wordTokens(norm);
  const feats = [];
  for (const w of words) {
    feats.push(`w:${w}`);
    if (w.length >= 3 && /[a-z]/.test(w)) feats.push(...charNgrams(w));
  }
  return { norm, words, feats };
}

/** Addestra il modello NB una sola volta all'import. */
const MODEL = (() => {
  const classDocs = {};
  const classFeat = {};
  const classTotal = {};
  const vocab = new Set();
  const wordVocab = new Set();

  for (const { intent, text } of INTENT_DATASET) {
    const { words, feats } = extractFeatures(text);
    classDocs[intent] = (classDocs[intent] || 0) + 1;
    if (!classFeat[intent]) classFeat[intent] = new Map();
    const map = classFeat[intent];
    for (const f of feats) {
      map.set(f, (map.get(f) || 0) + 1);
      classTotal[intent] = (classTotal[intent] || 0) + 1;
      vocab.add(f);
    }
    for (const w of words) wordVocab.add(`w:${w}`);
  }

  return {
    classDocs,
    classFeat,
    classTotal,
    wordVocab,
    N: INTENT_DATASET.length,
    V: vocab.size,
    intents: INTENTS.filter((i) => classDocs[i]),
  };
})();

/**
 * Classifica un testo in un singolo intent.
 * @returns {{ intent: string, confidence: number, recognized: number,
 *   ranked: Array<{ intent: string, score: number }> }}
 */
export function classifyIntent(text) {
  const { norm, words, feats } = extractFeatures(text);

  // Solo punteggiatura/spazi → rumore certo.
  if (!/[a-z0-9]/.test(norm)) {
    return { intent: 'noise', confidence: 1, recognized: 0, ranked: [] };
  }

  // Quante parole distinte sono "conosciute" (presenti nel vocabolario)?
  let recognized = 0;
  const seen = new Set();
  for (const w of words) {
    const key = `w:${w}`;
    if (MODEL.wordVocab.has(key) && !seen.has(key)) {
      recognized += 1;
      seen.add(key);
    }
  }

  const featCounts = new Map();
  for (const f of feats) featCounts.set(f, (featCounts.get(f) || 0) + 1);

  const logScores = MODEL.intents.map((c) => {
    let s = Math.log(MODEL.classDocs[c] / MODEL.N);
    const denom = MODEL.classTotal[c] + MODEL.V;
    const fmap = MODEL.classFeat[c];
    for (const [f, n] of featCounts) {
      const count = (fmap.get(f) || 0) + 1;
      s += n * Math.log(count / denom);
    }
    return [c, s];
  });

  logScores.sort((a, b) => b[1] - a[1]);
  const max = logScores[0][1];
  let sum = 0;
  const exps = logScores.map(([c, s]) => {
    const e = Math.exp(s - max);
    sum += e;
    return [c, e];
  });
  const ranked = exps.map(([c, e]) => ({ intent: c, score: e / sum }));
  const top = ranked[0];

  // Nessuna parola conosciuta → rumore (gibberish, refusi non recuperabili).
  if (recognized === 0) {
    return { intent: 'noise', confidence: top.score, recognized, ranked };
  }

  return { intent: top.intent, confidence: top.score, recognized, ranked };
}

/** Spezza la frase sui connettori ("e", "e poi", "e anche", "poi", ",", "+", "and", "then"). */
function segments(text) {
  // Usa il testo minuscolo ma con accenti, così "è" (verbo) non viene scambiato per "e".
  const lower = String(text || '').toLowerCase();
  return lower
    .split(/\s*(?:\+|,|\be\s+poi\b|\be\s+anche\b|\band\s+then\b|\bthen\b|\band\b|\bpoi\b|\be\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Rileva 1+ intent in una frase composta (multi-intent), nell'ordine di lettura.
 * @returns {string[]} intent distinti (esclude noise / segmenti non riconosciuti)
 */
export function detectMultiIntent(text) {
  const out = [];
  const seen = new Set();
  for (const seg of segments(text)) {
    const r = classifyIntent(seg);
    if (r.intent === 'noise' || r.recognized === 0) continue;
    if (!seen.has(r.intent)) {
      seen.add(r.intent);
      out.push(r.intent);
    }
  }
  return out;
}
