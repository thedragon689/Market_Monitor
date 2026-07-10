/**
 * Verifica identity token Apple (Sign in with Apple) via JWKS pubbliche.
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const APPLE_ISS = 'https://appleid.apple.com';
const JWKS_URL = 'https://appleid.apple.com/auth/keys';
const CACHE_MS = 60 * 60 * 1000;

let keysCache = null;
let keysAt = 0;

async function fetchAppleKeys() {
  if (keysCache && Date.now() - keysAt < CACHE_MS) return keysCache;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error('Impossibile scaricare le chiavi Apple');
  const data = await res.json();
  keysCache = data.keys || [];
  keysAt = Date.now();
  return keysCache;
}

function publicKeyFromJwk(jwk) {
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

/**
 * @param {string} idToken — JWT restituito da Apple dopo Sign in with Apple
 * @returns {{ email: string, name: string|null, providerId: string }}
 */
export async function verifyAppleIdToken(idToken) {
  const clientId = process.env.APPLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error('APPLE_CLIENT_ID non configurato');

  const decoded = jwt.decode(String(idToken || ''), { complete: true });
  if (!decoded?.header?.kid) throw new Error('Token Apple non valido');

  const keys = await fetchAppleKeys();
  const jwk = keys.find((k) => k.kid === decoded.header.kid);
  if (!jwk) throw new Error('Chiave Apple non trovata');

  const pem = publicKeyFromJwk(jwk).export({ type: 'spki', format: 'pem' });
  const payload = jwt.verify(String(idToken), pem, { algorithms: ['RS256'] });

  if (payload.iss !== APPLE_ISS) throw new Error('Issuer Apple non valido');
  if (payload.aud !== clientId) throw new Error('Audience Apple non valida');

  const sub = String(payload.sub || '');
  if (!sub) throw new Error('Subject Apple mancante');

  // Apple invia l'email solo al primo consenso; i login successivi possono ometterla.
  const email = payload.email ? String(payload.email).toLowerCase() : null;

  return { email, name: null, providerId: sub };
}

export function isAppleOAuthConfigured() {
  return Boolean(process.env.APPLE_CLIENT_ID?.trim());
}
