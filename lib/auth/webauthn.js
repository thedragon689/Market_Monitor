/**
 * WebAuthn (passkey) — richiede @simplewebauthn/server se installato.
 */
import crypto from 'crypto';
import { getDb } from '../db.js';
import { issueTokenPair } from '../portfolio/auth.js';
import { auditLog } from '../auditLog.js';

const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'Market Monitor';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

const challenges = new Map();

function storeChallenge(key, challenge, ttlMs = 5 * 60_000) {
  challenges.set(key, { challenge, exp: Date.now() + ttlMs });
}

function takeChallenge(key) {
  const item = challenges.get(key);
  challenges.delete(key);
  if (!item || Date.now() > item.exp) return null;
  return item.challenge;
}

async function loadWebAuthn() {
  try {
    const mod = await import('@simplewebauthn/server');
    return mod;
  } catch {
    throw new Error('WebAuthn non disponibile: installa @simplewebauthn/server');
  }
}

export async function webauthnRegisterOptions(userId, email) {
  const swa = await loadWebAuthn();
  const db = getDb();
  const existing = db
    ? await db`SELECT credential_id FROM webauthn_credentials WHERE user_id = ${userId}`
    : [];

  const options = await swa.generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(userId),
    userName: email,
    attestationType: 'none',
    excludeCredentials: existing.map((r) => ({
      id: Buffer.from(r.credential_id, 'base64url'),
      type: 'public-key',
    })),
  });
  storeChallenge(`reg:${userId}`, options.challenge);
  return options;
}

export async function webauthnRegisterVerify(userId, response) {
  const swa = await loadWebAuthn();
  const db = getDb();
  if (!db) throw new Error('Database non configurato');

  const expected = takeChallenge(`reg:${userId}`);
  if (!expected) throw new Error('Challenge scaduta');

  const verification = await swa.verifyRegistrationResponse({
    response,
    expectedChallenge: expected,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registrazione WebAuthn fallita');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  await db`
    INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_type, backed_up)
    VALUES (
      ${userId},
      ${Buffer.from(credential.id).toString('base64url')},
      ${Buffer.from(credential.publicKey).toString('base64')},
      ${credential.counter},
      ${credentialDeviceType},
      ${credentialBackedUp}
    )
    ON CONFLICT (credential_id) DO UPDATE SET
      public_key = EXCLUDED.public_key,
      counter = EXCLUDED.counter
  `;
  await auditLog(userId, 'auth.webauthn.register');
  return { ok: true };
}

export async function webauthnLoginOptions(email) {
  const swa = await loadWebAuthn();
  const db = getDb();
  if (!db) throw new Error('Database non configurato');

  const users = await db`SELECT id, email FROM users WHERE email = ${String(email).toLowerCase()} LIMIT 1`;
  const user = users[0];
  if (!user) throw new Error('Utente non trovato');

  const creds = await db`
    SELECT credential_id, public_key, counter, transports
    FROM webauthn_credentials WHERE user_id = ${user.id}
  `;
  if (!creds.length) throw new Error('Nessuna passkey registrata');

  const options = await swa.generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: creds.map((c) => ({
      id: Buffer.from(c.credential_id, 'base64url'),
      type: 'public-key',
      transports: c.transports || undefined,
    })),
  });
  storeChallenge(`login:${user.id}`, options.challenge);
  return { options, userId: user.id };
}

export async function webauthnLoginVerify(userId, response) {
  const swa = await loadWebAuthn();
  const db = getDb();
  if (!db) throw new Error('Database non configurato');

  const expected = takeChallenge(`login:${userId}`);
  if (!expected) throw new Error('Challenge scaduta');

  const credId = response.id;
  const rows = await db`
    SELECT * FROM webauthn_credentials
    WHERE user_id = ${userId} AND credential_id = ${credId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new Error('Credenziale non trovata');

  const verification = await swa.verifyAuthenticationResponse({
    response,
    expectedChallenge: expected,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: Buffer.from(row.credential_id, 'base64url'),
      publicKey: Buffer.from(row.public_key, 'base64'),
      counter: Number(row.counter),
    },
  });
  if (!verification.verified) throw new Error('Autenticazione WebAuthn fallita');

  await db`UPDATE webauthn_credentials SET counter = ${verification.authenticationInfo.newCounter} WHERE id = ${row.id}`;
  const users = await db`SELECT id, email FROM users WHERE id = ${userId} LIMIT 1`;
  const user = users[0];
  const tokens = await issueTokenPair(user.id);
  await auditLog(user.id, 'auth.webauthn.login');
  return { user: { id: user.id, email: user.email }, ...tokens };
}

export function isWebAuthnConfigured() {
  return Boolean(process.env.WEBAUTHN_RP_ID || process.env.NODE_ENV !== 'production');
}
