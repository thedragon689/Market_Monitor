/**
 * Verifica deterministica del circuit breaker (lib/sources/circuitBreaker.js).
 * Usa un "now" esplicito per non dipendere dai timer reali.
 *
 *   node scripts/verify-circuit.js
 */
import assert from 'node:assert';
import {
  canAttempt,
  recordSuccess,
  recordFailure,
  breakerState,
  isSystemicFailure,
  resetBreakers,
} from '../lib/sources/circuitBreaker.js';

const COOLDOWN = Number(process.env.CB_COOLDOWN_MS) || 30_000;
const THRESHOLD = Number(process.env.CB_FAILURE_THRESHOLD) || 3;
let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const timeout = new Error('request timeout of 15000ms exceeded');
const notFound = new Error('Request failed with status code 404');

console.log('Circuit breaker:');

check('errori sistemici vs non sistemici', () => {
  assert.equal(isSystemicFailure(timeout), true);
  assert.equal(isSystemicFailure(new Error('ECONNRESET')), true);
  assert.equal(isSystemicFailure(new Error('429 Too Many Requests')), true);
  assert.equal(isSystemicFailure(new Error('status code 503')), true);
  assert.equal(isSystemicFailure(notFound), false);
  assert.equal(isSystemicFailure(new Error('Ticker non trovato')), false);
});

check('apre dopo N fallimenti sistemici', () => {
  resetBreakers();
  const t0 = 1_000_000;
  for (let i = 0; i < THRESHOLD; i++) {
    assert.equal(canAttempt('yahoo', t0), true);
    recordFailure('yahoo', timeout, t0);
  }
  assert.equal(breakerState('yahoo', t0).state, 'open');
  assert.equal(canAttempt('yahoo', t0), false);
});

check('i 404 non aprono il circuito', () => {
  resetBreakers();
  const t0 = 2_000_000;
  for (let i = 0; i < THRESHOLD + 2; i++) recordFailure('stooq', notFound, t0);
  assert.equal(breakerState('stooq', t0).state, 'closed');
  assert.equal(canAttempt('stooq', t0), true);
});

check('half-open dopo il cooldown, poi chiuso su successo', () => {
  resetBreakers();
  const t0 = 3_000_000;
  for (let i = 0; i < THRESHOLD; i++) recordFailure('fcsapi', timeout, t0);
  assert.equal(canAttempt('fcsapi', t0 + COOLDOWN - 1), false, 'ancora aperto nel cooldown');
  assert.equal(canAttempt('fcsapi', t0 + COOLDOWN), true, 'half-open a fine cooldown');
  recordSuccess('fcsapi', t0 + COOLDOWN + 5);
  assert.equal(breakerState('fcsapi').state, 'closed');
});

check('half-open: un fallimento riapre subito', () => {
  resetBreakers();
  const t0 = 4_000_000;
  for (let i = 0; i < THRESHOLD; i++) recordFailure('av', timeout, t0);
  assert.equal(canAttempt('av', t0 + COOLDOWN), true); // half-open
  recordFailure('av', timeout, t0 + COOLDOWN + 1);
  assert.equal(breakerState('av', t0 + COOLDOWN + 1).state, 'open');
});

check('il successo azzera i fallimenti', () => {
  resetBreakers();
  const t0 = 5_000_000;
  recordFailure('yahoo', timeout, t0);
  recordFailure('yahoo', timeout, t0);
  recordSuccess('yahoo', t0);
  assert.equal(breakerState('yahoo', t0).failures, 0);
  assert.equal(breakerState('yahoo', t0).state, 'closed');
});

resetBreakers();
console.log(`\n${passed} test superati.`);
