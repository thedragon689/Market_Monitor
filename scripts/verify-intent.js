/**
 * Verifica del classificatore di intent — node scripts/verify-intent.js
 * Offline: nessuna rete. Misura l'accuratezza sul dataset, la robustezza ai
 * refusi, il riconoscimento del rumore e lo splitting multi-intent.
 */
import {
  INTENT_DATASET,
  MULTI_INTENT_SAMPLES,
} from '../market-quotes-frontend/src/data/intentDataset.js';
import {
  classifyIntent,
  detectMultiIntent,
} from '../market-quotes-frontend/src/utils/intentClassifier.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

// ── Accuratezza sul dataset (self-consistency) ───────────────────────
let correct = 0;
const confusion = {};
for (const { intent, text } of INTENT_DATASET) {
  const pred = classifyIntent(text).intent;
  if (pred === intent) correct += 1;
  else {
    const key = `${intent} → ${pred}`;
    confusion[key] = (confusion[key] || 0) + 1;
  }
}
const acc = correct / INTENT_DATASET.length;
console.log(`\nAccuratezza dataset: ${(acc * 100).toFixed(1)}% (${correct}/${INTENT_DATASET.length})`);
if (Object.keys(confusion).length) {
  console.log('Errori:', JSON.stringify(confusion, null, 0));
}
assert(acc >= 0.9, `accuratezza ≥ 90% (ottenuto ${(acc * 100).toFixed(1)}%)`);

// ── Robustezza ai refusi ─────────────────────────────────────────────
const typos = [
  ['grfico BTC', 'get_chart'],
  ['indcatori', 'get_indicators'],
  ['prevsione AAPL', 'get_forecast'],
  ['corelazioni', 'get_correlations'],
  ['aggungi 10 AAPL', 'portfolio_add'],
  ['portflio', 'portfolio_status'],
];
for (const [text, expected] of typos) {
  assert(classifyIntent(text).intent === expected, `refuso "${text}" → ${expected}`);
}

// ── Riconoscimento intent principali (parafrasi non nel dataset) ─────
const paraphrases = [
  ['quanto costa una azione Apple oggi', 'get_price'],
  ['vorrei una previsione a 7 giorni su bitcoin', 'get_forecast'],
  ['mi conviene comprare o no', 'get_trade_advice'],
  ['aggiungi tre azioni tesla al mio portafoglio', 'portfolio_add'],
  ['come è messo il mio portafoglio', 'portfolio_status'],
];
let paraOk = 0;
for (const [text, expected] of paraphrases) {
  if (classifyIntent(text).intent === expected) paraOk += 1;
  else console.log(`  paraphrase miss: "${text}" → ${classifyIntent(text).intent} (atteso ${expected})`);
}
assert(paraOk >= 4, `paraphrase generalizzate ≥ 4/5 (ottenuto ${paraOk})`);

// ── Rumore / gibberish ───────────────────────────────────────────────
const noise = ['asdlfkj', '123456', '???', 'plssssss', 'bitcnooooon', '....'];
for (const text of noise) {
  assert(classifyIntent(text).intent === 'noise', `rumore "${text}" → noise`);
}

// ── Multi-intent ─────────────────────────────────────────────────────
let multiOk = 0;
for (const text of MULTI_INTENT_SAMPLES) {
  const intents = detectMultiIntent(text);
  if (intents.length >= 2) multiOk += 1;
  else console.log(`  multi miss (${intents.length}): "${text}" → [${intents.join(', ')}]`);
}
console.log(`\nMulti-intent: ${multiOk}/${MULTI_INTENT_SAMPLES.length} frasi con ≥2 intent`);
assert(multiOk >= 12, `multi-intent ≥ 12/15 (ottenuto ${multiOk})`);

// Un esempio concreto e verificabile.
const ex = detectMultiIntent('Dammi il prezzo di BTC e anche una previsione a 7 giorni');
assert(
  ex.includes('get_price') && ex.includes('get_forecast'),
  'multi: prezzo + previsione riconosciuti entrambi'
);

if (failed) {
  console.error(`\n${failed} test falliti`);
  process.exit(1);
}
console.log('\nTutti i controlli intent passati.');
