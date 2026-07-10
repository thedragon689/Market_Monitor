/**
 * Verifica che le domande suggerite nel chatbot vengano interpretate correttamente.
 * node scripts/verify-chat-suggestions.js
 */
import { buildLocalAnswer } from '../market-quotes-frontend/src/utils/assistant.js';

const SUGGESTIONS = [
  {
    text: 'Come funziona Market Monitor?',
    expect: { guideOrHelp: true, minConfidence: 0.9 },
  },
  {
    text: "Cos'è l'RSI?",
    expect: { conceptId: 'rsi', minConfidence: 0.9 },
  },
  {
    text: 'Prezzo di Apple',
    expect: { intent: 'get_price', symbol: 'AAPL', hasAction: true },
  },
  {
    text: 'Previsione BTC',
    expect: { intent: 'get_forecast', symbolIncludes: 'BTC', hasAction: true },
  },
];

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

for (const { text, expect } of SUGGESTIONS) {
  const r = buildLocalAnswer(text, {});
  console.log(`\n→ "${text}"`);
  console.log(`  confidence=${r.confidence} intent=${r.intent ?? '-'} concept=${r.conceptId ?? '-'} guide=${r.guideTopic ?? '-'}`);
  console.log(`  action=${r.action ? JSON.stringify(r.action) : 'null'}`);
  console.log(`  reply: ${String(r.reply).slice(0, 90).replace(/\n/g, ' ')}…`);

  if (expect.guideOrHelp) {
    assert(
      r.guideTopic || r.confidence >= 0.9,
      `"${text}" → guida app o risposta ad alta confidenza`
    );
  }
  if (expect.conceptId) {
    assert(r.conceptId === expect.conceptId, `"${text}" → concept ${expect.conceptId}`);
  }
  if (expect.intent) {
    assert(r.intent === expect.intent, `"${text}" → intent ${expect.intent}`);
  }
  if (expect.symbol && r.action?.symbol) {
    assert(
      r.action.symbol === expect.symbol,
      `"${text}" → naviga su ${expect.symbol} (ottenuto ${r.action.symbol})`
    );
  }
  if (expect.symbolIncludes && r.action?.symbol) {
    assert(
      r.action.symbol.includes(expect.symbolIncludes),
      `"${text}" → simbolo contiene ${expect.symbolIncludes}`
    );
  }
  if (expect.hasAction) {
    assert(r.action?.type === 'navigate', `"${text}" → azione di navigazione`);
  }
  if (expect.minConfidence) {
    assert(
      (r.confidence ?? 0) >= expect.minConfidence,
      `"${text}" → confidence ≥ ${expect.minConfidence}`
    );
  }
}

// Chip e input manuale devono essere equivalenti (stesso testo).
const manual = buildLocalAnswer('  Prezzo di Apple  ', {});
const chip = buildLocalAnswer('Prezzo di Apple', {});
assert(
  manual.intent === chip.intent && manual.action?.symbol === chip.action?.symbol,
  'testo con spazi = chip suggerito per Prezzo di Apple'
);

if (failed) {
  console.error(`\n${failed} test falliti`);
  process.exit(1);
}
console.log('\nTutti i controlli suggerimenti chat passati.');
