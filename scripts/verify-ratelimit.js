/**
 * Verifica rate limiting tier-based — eseguire: node scripts/verify-ratelimit.js
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-ratelimit';
process.env.RL_WINDOW_MS = '60000';
process.env.RL_ANON_MAX = '3';
process.env.RL_FREE_MAX = '5';
process.env.RL_PRO_MAX = '9';

const { rateLimit, defaultCostFor, resetRateLimitStore, resolveIdentity } = await import(
  '../lib/rateLimit.js'
);
const { signToken } = await import('../lib/portfolio/auth.js');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

function mockReq({ path = '/api/health', ip = '9.9.9.9', token = null } = {}) {
  const headers = { 'x-forwarded-for': ip };
  if (token) headers.authorization = `Bearer ${token}`;
  return { path, headers, socket: {} };
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    set(k, v) {
      this.headers[k.toLowerCase()] = String(v);
      return this;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(o) {
      this.body = o;
      return this;
    },
  };
}

function run(mw, req) {
  const res = mockRes();
  let nextCalled = false;
  mw(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

// ── Cost map ─────────────────────────────────────────────────────────
assert(defaultCostFor('/api/health') === 1, 'costo health = 1');
assert(defaultCostFor('/api/forecast') === 4, 'costo forecast = 4');
assert(defaultCostFor('/api/chat') === 5, 'costo chat = 5');
assert(defaultCostFor('/api/chat/config') === 1, 'costo chat/config = 1 (non chat)');

// ── Identity / tier ──────────────────────────────────────────────────
assert(resolveIdentity(mockReq()).tier === 'anonymous', 'nessun token → anonymous');
const token = signToken('user-42');
assert(resolveIdentity(mockReq({ token })).tier === 'free', 'token valido → free');
assert(resolveIdentity(mockReq({ token: 'garbage' })).tier === 'anonymous', 'token invalido → anonymous');

// ── Anonymous: limite + header + 429 ─────────────────────────────────
resetRateLimitStore();
const mw = rateLimit({ scope: 'test', costFn: defaultCostFor });
const first = run(mw, mockReq({ ip: '1.1.1.1' }));
assert(first.nextCalled, 'anon 1a richiesta passa');
assert(first.res.headers['ratelimit-limit'] === '3', 'header RateLimit-Limit = 3');
assert(first.res.headers['ratelimit-remaining'] === '2', 'header RateLimit-Remaining = 2');
assert(Number(first.res.headers['ratelimit-reset']) > 0, 'header RateLimit-Reset > 0');
assert(first.res.headers['ratelimit-policy'] === '3;w=60', 'header RateLimit-Policy');
assert(first.res.headers['x-ratelimit-tier'] === 'anonymous', 'header X-RateLimit-Tier');

run(mw, mockReq({ ip: '1.1.1.1' }));
run(mw, mockReq({ ip: '1.1.1.1' }));
const blocked = run(mw, mockReq({ ip: '1.1.1.1' }));
assert(!blocked.nextCalled, '4a richiesta anon bloccata');
assert(blocked.res.statusCode === 429, 'status 429 al superamento');
assert(Number(blocked.res.headers['retry-after']) > 0, 'header Retry-After su 429');
assert(blocked.res.body?.tier === 'anonymous', 'body 429 riporta tier');
assert(blocked.res.body?.retryAfter > 0, 'body 429 riporta retryAfter');

// IP diverso → bucket indipendente
const other = run(mw, mockReq({ ip: '2.2.2.2' }));
assert(other.nextCalled, 'IP diverso non è influenzato');

// ── Free tier: limite più alto e bucket separato ─────────────────────
resetRateLimitStore();
let freeBlocked = null;
for (let i = 0; i < 6; i++) freeBlocked = run(mw, mockReq({ token, ip: '1.1.1.1' }));
assert(freeBlocked.res.statusCode === 429, 'free bloccato dopo 5 (max free)');
assert(freeBlocked.res.headers['ratelimit-limit'] === '5', 'free limit = 5');
// stesso IP ma anonymous ha ancora budget (bucket per-tier separato)
const anonStill = run(mw, mockReq({ ip: '1.1.1.1' }));
assert(anonStill.nextCalled, 'bucket free e anonymous sono separati');

// ── Pro tier via allowlist ───────────────────────────────────────────
resetRateLimitStore();
process.env.RL_PRO_USER_IDS = 'user-77';
const proToken = signToken('user-77');
assert(resolveIdentity(mockReq({ token: proToken })).tier === 'pro', 'allowlist → pro');
const proRun = run(mw, mockReq({ token: proToken }));
assert(proRun.res.headers['ratelimit-limit'] === '9', 'pro limit = 9');
delete process.env.RL_PRO_USER_IDS;

// ── Costo per endpoint onerosi ───────────────────────────────────────
resetRateLimitStore();
const heavy = run(mw, mockReq({ path: '/api/forecast', ip: '3.3.3.3' }));
assert(heavy.res.headers['ratelimit-remaining'] === '0', 'forecast (costo 4) su max 3 → remaining 0');
const heavyBlocked = run(mw, mockReq({ path: '/api/forecast', ip: '3.3.3.3' }));
assert(heavyBlocked.res.statusCode === 429, 'seconda forecast supera subito il budget');

// Scenario produzione: mount su /api → req.path spogliato, originalUrl completo.
resetRateLimitStore();
const mounted = mockReq({ path: '/forecast', ip: '5.5.5.5' });
mounted.originalUrl = '/api/forecast?days=5';
const mountedRun = run(mw, mounted);
assert(
  mountedRun.res.headers['ratelimit-remaining'] === '0',
  'costo risolto da originalUrl (mount /api)'
);

// ── Kill switch ──────────────────────────────────────────────────────
resetRateLimitStore();
process.env.RL_DISABLED = '1';
let disabledOk = true;
for (let i = 0; i < 10; i++) {
  if (!run(mw, mockReq({ ip: '4.4.4.4' })).nextCalled) disabledOk = false;
}
assert(disabledOk, 'RL_DISABLED=1 disattiva il limite');
delete process.env.RL_DISABLED;

if (failed) {
  console.error(`\n${failed} test falliti`);
  process.exit(1);
}
console.log('\nTutti i controlli rate limiting passati.');
