import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, isDbConfigured } from '../db.js';
import { auditLog } from '../auditLog.js';
import { issueEmailVerification, sendVerificationEmail } from './emailVerification.js';
import {
  isAuth0Enabled,
  looksLikeAuth0Token,
  runAuth0Validation,
  profileFromAuth0Payload,
} from '../auth/auth0.js';
import { getOrCreateAuth0User } from '../auth/auth0User.js';

const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';
const JWT_LEGACY_EXPIRES = '30d';

let jwtSecretCache;

function isDeployed() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NETLIFY === 'true' ||
    Boolean(process.env.CONTEXT) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

function resolveJwtSecret() {
  if (jwtSecretCache) return jwtSecretCache;

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    if (isDeployed()) {
      throw new Error('JWT_SECRET obbligatorio in produzione');
    }
    jwtSecretCache = 'dev-only-change-in-production';
    return jwtSecretCache;
  }
  jwtSecretCache = secret;
  return jwtSecretCache;
}

export function validatePassword(password) {
  const p = String(password || '');
  if (p.length < 8) throw new Error('Password minimo 8 caratteri');
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p)) {
    throw new Error('Password deve contenere maiuscole e minuscole');
  }
  if (!/[0-9]/.test(p)) throw new Error('Password deve contenere almeno un numero');
  return true;
}

export async function registerUser(email, password) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');

  const normalized = String(email).trim().toLowerCase();
  if (!normalized.includes('@')) throw new Error('Email non valida');
  validatePassword(password);

  const hash = await bcrypt.hash(password, 10);
  let rows;
  try {
    rows = await db`
      INSERT INTO users (email, password_hash, email_verified)
      VALUES (${normalized}, ${hash}, FALSE)
      RETURNING id, email, created_at
    `;
  } catch (err) {
    if (err?.code === '23505') throw new Error('Email già registrata');
    throw err;
  }
  const user = rows[0];
  const tokens = await issueTokenPair(user.id);
  await auditLog(user.id, 'auth.register');

  issueEmailVerification(user.id)
    .then((token) => token && sendVerificationEmail(user.email, token))
    .catch((err) => console.warn('[email-verify]', err.message));

  return { user: { id: user.id, email: user.email, emailVerified: false }, ...tokens };
}

export async function loginUser(email, password, totpCode) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');

  const normalized = String(email).trim().toLowerCase();
  const rows = await db`
    SELECT id, email, password_hash, totp_enabled, totp_secret, email_verified
    FROM users WHERE email = ${normalized}
  `;
  const user = rows[0];
  if (!user) throw new Error('Credenziali non valide');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('Credenziali non valide');

  if (user.totp_enabled) {
    const { verifyTotp } = await import('../auth/totp.js');
    if (!totpCode || !verifyTotp(user.totp_secret, totpCode)) {
      throw new Error('Codice 2FA non valido');
    }
  }

  const tokens = await issueTokenPair(user.id);
  await auditLog(user.id, 'auth.login');
  return {
    user: { id: user.id, email: user.email, emailVerified: Boolean(user.email_verified) },
    ...tokens,
  };
}

function hashToken(token) {
  return bcrypt.hashSync(token, 10);
}

function tokenLookupKey(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export async function issueTokenPair(userId) {
  const accessToken = jwt.sign({ sub: userId, typ: 'access' }, resolveJwtSecret(), {
    expiresIn: JWT_ACCESS_EXPIRES,
    algorithm: 'HS256',
  });
  const refreshToken = randomToken();
  const db = getDb();
  if (db) {
    const expiresAt = new Date(Date.now() + parseDurationMs(JWT_REFRESH_EXPIRES));
    const lookupKey = tokenLookupKey(refreshToken);
    await db`
      INSERT INTO refresh_tokens (user_id, token_hash, lookup_key, expires_at)
      VALUES (${userId}, ${hashToken(refreshToken)}, ${lookupKey}, ${expiresAt})
    `;
  }
  return {
    token: accessToken,
    accessToken,
    refreshToken: db ? refreshToken : undefined,
    expiresIn: JWT_ACCESS_EXPIRES,
  };
}

function parseDurationMs(str) {
  const m = String(str).match(/^(\d+)([smhd])$/);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
  return n * u;
}

export async function refreshAccessToken(refreshToken) {
  const db = getDb();
  if (!db || !refreshToken) throw new Error('Refresh non disponibile');

  const lookupKey = tokenLookupKey(refreshToken);
  let rows = await db`
    SELECT id, user_id, token_hash, expires_at, revoked_at
    FROM refresh_tokens
    WHERE lookup_key = ${lookupKey}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;

  let match = rows[0];
  if (match && !bcrypt.compareSync(refreshToken, match.token_hash)) {
    match = null;
  }

  // Legacy tokens senza lookup_key
  if (!match) {
    const legacy = await db`
      SELECT id, user_id, token_hash, expires_at, revoked_at
      FROM refresh_tokens
      WHERE lookup_key IS NULL
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 50
    `;
    match = legacy.find((r) => bcrypt.compareSync(refreshToken, r.token_hash));
  }

  if (!match) throw new Error('Refresh token non valido');

  await db`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ${match.id}`;
  return issueTokenPair(match.user_id);
}

export async function revokeRefreshTokens(userId) {
  const db = getDb();
  if (!db) return;
  await db`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${userId} AND revoked_at IS NULL`;
}

export function signToken(userId) {
  return jwt.sign({ sub: userId, typ: 'access' }, resolveJwtSecret(), {
    expiresIn: JWT_LEGACY_EXPIRES,
    algorithm: 'HS256',
  });
}

export function verifyToken(token, { type = 'access' } = {}) {
  const payload = jwt.verify(token, resolveJwtSecret(), { algorithms: ['HS256'] });
  if (type && payload.typ && payload.typ !== type) {
    throw new Error('Tipo token non valido');
  }
  return payload;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }
  const token = header.slice(7);

  if (isAuth0Enabled() && looksLikeAuth0Token(token)) {
    try {
      const authResult = await runAuth0Validation(req, res);
      const profile = profileFromAuth0Payload(authResult?.payload || {});
      const user = await getOrCreateAuth0User(profile);
      req.userId = user.id;
      req.auth0Id = profile.auth0Id;
      req.userEmail = user.email;
      return next();
    } catch (err) {
      const code = err?.code || err?.error;
      if (code === 'mfa_required') {
        return res.status(403).json({
          error: 'mfa_required',
          message: 'Autenticazione a 2 fattori richiesta. Completa MFA su Auth0.',
        });
      }
      return res.status(401).json({
        error: 'Token Auth0 non valido o scaduto',
        detail: err?.message,
      });
    }
  }

  try {
    const payload = verifyToken(token, { type: 'access' });
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}
