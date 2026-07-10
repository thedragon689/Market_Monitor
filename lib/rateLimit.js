/**
 * Rate limiting tier-based (in-memory) con header standard IETF.
 *
 * Tier:
 *  - anonymous → chiave per IP
 *  - free      → utente autenticato (JWT valido), chiave per userId
 *  - pro       → utente in allowlist RL_PRO_USER_IDS o con claim JWT tier:'pro'
 *
 * Header emessi su ogni risposta:
 *  - RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset (draft IETF, reset in secondi)
 *  - RateLimit-Policy: "<max>;w=<finestra_s>"
 *  - X-RateLimit-* (legacy, reset epoch) per client più vecchi
 *  - Retry-After (solo su 429)
 *
 * Nota: lo store è in-memory (come cache e circuit breaker). In ambienti
 * serverless multi-istanza i conteggi non sono condivisi: per limiti "duri"
 * distribuiti servirebbe Redis (vedi ROADMAP P2).
 */
import { verifyToken } from './portfolio/auth.js';

const buckets = new Map();
const MAX_ENTRIES = 5000;

function prune(now) {
  if (buckets.size <= MAX_ENTRIES) return;
  for (const [key, entry] of buckets) {
    if (now > entry.reset) buckets.delete(key);
  }
}

/**
 * Consuma `cost` token dal bucket `key` in una finestra fissa.
 * @returns {{allowed:boolean, limit:number, remaining:number, reset:number, resetSeconds:number, used:number}}
 */
export function consume(key, { windowMs, max, cost = 1 } = {}) {
  const now = Date.now();
  prune(now);
  let entry = buckets.get(key);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count += cost;
  const remaining = Math.max(0, max - entry.count);
  return {
    allowed: entry.count <= max,
    limit: max,
    remaining,
    reset: entry.reset,
    resetSeconds: Math.max(0, Math.ceil((entry.reset - now) / 1000)),
    used: entry.count,
  };
}

/** Azzera lo store (test). */
export function resetRateLimitStore() {
  buckets.clear();
}

export function clientIp(req) {
  const nfIp = req.headers?.['x-nf-client-connection-ip'];
  if (typeof nfIp === 'string' && nfIp.length) return nfIp.trim();
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

function intEnv(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Configurazione tier (override via env). */
export function getTiers() {
  const windowMs = intEnv('RL_WINDOW_MS', 60_000);
  return {
    anonymous: { windowMs, max: intEnv('RL_ANON_MAX', 120) },
    free: { windowMs, max: intEnv('RL_FREE_MAX', 400) },
    pro: { windowMs, max: intEnv('RL_PRO_MAX', 1200) },
  };
}

function proUserIds() {
  return new Set(
    String(process.env.RL_PRO_USER_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/**
 * Determina tier e chiave del richiedente. Verifica il JWT in modalità "soft":
 * un token assente/non valido declassa semplicemente ad anonymous.
 */
export function resolveIdentity(req) {
  const header = req.headers?.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.slice(7));
      const uid = String(payload.sub);
      const isPro = payload.tier === 'pro' || proUserIds().has(uid);
      return { tier: isPro ? 'pro' : 'free', key: `u:${uid}` };
    } catch {
      /* token non valido → anonymous */
    }
  }
  return { tier: 'anonymous', key: `ip:${clientIp(req)}` };
}

/** Costo (peso) di default per gli endpoint più onerosi. */
const DEFAULT_COST_RULES = [
  [/^\/api\/chat$/, 5],
  [/^\/api\/chat\/tts$/, 3],
  [/^\/api\/translate$/, 3],
  [/^\/api\/forecast/, 4],
  [/^\/api\/intelligence/, 3],
  [/^\/api\/analysis-bundle/, 3],
  [/^\/api\/analysis/, 2],
  [/^\/api\/ohlc/, 2],
  [/^\/api\/market\/batch/, 2],
  [/^\/api\/history\/batch/, 3],
];

export function defaultCostFor(pathName) {
  for (const [re, cost] of DEFAULT_COST_RULES) {
    if (re.test(pathName)) return cost;
  }
  return 1;
}

function setRateHeaders(res, conf, result) {
  res.set('RateLimit-Limit', String(result.limit));
  res.set('RateLimit-Remaining', String(result.remaining));
  res.set('RateLimit-Reset', String(result.resetSeconds));
  res.set('RateLimit-Policy', `${conf.max};w=${Math.round(conf.windowMs / 1000)}`);
  res.set('X-RateLimit-Limit', String(result.limit));
  res.set('X-RateLimit-Remaining', String(result.remaining));
  res.set('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));
}

/**
 * Middleware Express: applica il limite in base al tier e imposta gli header.
 * @param {{scope?:string, cost?:number, costFn?:(p:string)=>number}} [options]
 */
export function rateLimit({ scope = 'api', cost = 1, costFn = null } = {}) {
  return (req, res, next) => {
    if (process.env.RL_DISABLED === '1') return next();
    const tiers = getTiers();
    const { tier, key } = resolveIdentity(req);
    const conf = tiers[tier] || tiers.anonymous;
    // originalUrl mantiene il prefisso di mount (es. /api) che Express toglie da req.path.
    const pathForCost = (req.originalUrl || req.url || req.path || '').split('?')[0];
    const weight = costFn ? costFn(pathForCost) : cost;
    const result = consume(`${scope}:${tier}:${key}`, {
      windowMs: conf.windowMs,
      max: conf.max,
      cost: weight,
    });

    setRateHeaders(res, conf, result);
    res.set('X-RateLimit-Tier', tier);

    if (!result.allowed) {
      res.set('Retry-After', String(result.resetSeconds));
      return res.status(429).json({
        error: 'Troppe richieste: hai superato il limite. Riprova a breve.',
        tier,
        limit: result.limit,
        retryAfter: result.resetSeconds,
      });
    }
    return next();
  };
}
