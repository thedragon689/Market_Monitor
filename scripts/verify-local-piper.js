/**
 * Verifica TTS locale Piper (Pied) — salta se non installato.
 * npm run verify:local-piper
 */
import { isLocalPiperAvailable, synthesizeLocalPiper } from '../lib/localPiperTts.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

if (!isLocalPiperAvailable()) {
  console.log('SKIP: Piper locale non installato (ok in CI/senza Pied)');
  process.exit(0);
}

assert(isLocalPiperAvailable(), 'Piper disponibile');

const audio = await synthesizeLocalPiper('Test voce Paola per Market Monitor.');
assert(typeof audio === 'string' && audio.startsWith('data:audio/wav;base64,'), 'audio WAV base64');
assert(audio.length > 500, 'payload audio non vuoto');

if (failed) {
  console.error(`\n${failed} test falliti`);
  process.exit(1);
}
console.log('\nverify-local-piper: tutti i test passati');
