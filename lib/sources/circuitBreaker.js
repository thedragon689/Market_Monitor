/**
 * Circuit breaker per provider dati esterni.
 *
 * Stati:
 *  - closed:    normale, i tentativi passano.
 *  - open:      dopo N fallimenti *sistemici* consecutivi; i tentativi vengono
 *               saltati finché non scade il cooldown.
 *  - half-open: trascorso il cooldown, si concede un singolo tentativo di prova:
 *               se riesce → closed, se fallisce → open di nuovo.
 *
 * In-memory (per-processo), come il resto della cache. Le funzioni accettano
 * `now` per rendere la logica testabile in modo deterministico.
 */

const FAILURE_THRESHOLD = Number(process.env.CB_FAILURE_THRESHOLD) || 3;
const COOLDOWN_MS = Number(process.env.CB_COOLDOWN_MS) || 30_000;

const breakers = new Map();

function ensure(key) {
  let b = breakers.get(key);
  if (!b) {
    b = {
      failures: 0,
      state: 'closed',
      openedAt: 0,
      trips: 0,
      lastError: null,
      lastSuccess: 0,
      lastFailure: 0,
    };
    breakers.set(key, b);
  }
  return b;
}

/**
 * Classifica un errore come "sistemico" (problema del provider: timeout, rete,
 * 429, 5xx) vs. non sistemico (es. ticker 404): solo i primi aprono il circuito,
 * così un simbolo inesistente non penalizza l'intero provider.
 */
export function isSystemicFailure(error) {
  const msg = String(error?.message ?? error ?? '').toLowerCase();
  if (!msg) return false;
  if (/\b4(0[0-4]|09)\b|not found|non trovato|inesistente|no data|non applicabile|senza chiave|non disponibile per/.test(msg)) {
    return false;
  }
  return /timeout|timed out|econn|enotfound|eai_again|network|socket|aborted|429|too many|rate limit|rate-limit|\b5\d\d\b|status code 5|non ha risposto|unavailable|service|bad gateway|gateway/.test(
    msg
  );
}

/** True se è consentito tentare il provider adesso. Può passare a half-open. */
export function canAttempt(key, now = Date.now()) {
  const b = ensure(key);
  if (b.state === 'open') {
    if (now - b.openedAt >= COOLDOWN_MS) {
      b.state = 'half-open';
      return true;
    }
    return false;
  }
  return true; // closed | half-open
}

export function recordSuccess(key, now = Date.now()) {
  const b = ensure(key);
  b.failures = 0;
  b.state = 'closed';
  b.openedAt = 0;
  b.lastError = null;
  b.lastSuccess = now;
}

/** Registra un fallimento. Apre il circuito solo su errori sistemici. */
export function recordFailure(key, error = null, now = Date.now()) {
  const b = ensure(key);
  b.lastFailure = now;
  b.lastError = error?.message ?? (typeof error === 'string' ? error : null);
  if (!isSystemicFailure(error)) return b.state;
  b.failures += 1;
  if (b.state === 'half-open' || b.failures >= FAILURE_THRESHOLD) {
    if (b.state !== 'open') b.trips += 1;
    b.state = 'open';
    b.openedAt = now;
  }
  return b.state;
}

export function breakerState(key, now = Date.now()) {
  const b = ensure(key);
  let state = b.state;
  if (state === 'open' && now - b.openedAt >= COOLDOWN_MS) state = 'half-open';
  const cooldownRemainingMs = state === 'open' ? Math.max(0, COOLDOWN_MS - (now - b.openedAt)) : 0;
  return {
    provider: key,
    state,
    failures: b.failures,
    trips: b.trips,
    cooldownRemainingMs,
    lastError: b.lastError,
    lastSuccess: b.lastSuccess || null,
    lastFailure: b.lastFailure || null,
  };
}

export function breakerSnapshot(now = Date.now()) {
  return {
    config: { failureThreshold: FAILURE_THRESHOLD, cooldownMs: COOLDOWN_MS },
    providers: [...breakers.keys()].map((k) => breakerState(k, now)),
  };
}

/** Solo per test. */
export function resetBreakers() {
  breakers.clear();
}
