/**
 * Auth0 JWT validation (RS256) — opzionale, convive con JWT legacy HS256.
 */
import jwt from 'jsonwebtoken';
import { auth } from 'express-oauth2-jwt-bearer';

export function isAuth0Enabled() {
  return Boolean(process.env.AUTH0_DOMAIN?.trim() && process.env.AUTH0_AUDIENCE?.trim());
}

let validator = null;

function getValidator() {
  if (!validator) {
    validator = auth({
      audience: process.env.AUTH0_AUDIENCE,
      issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
      tokenSigningAlg: 'RS256',
    });
  }
  return validator;
}

/** True se il bearer sembra un access token Auth0 (RS256 + iss auth0). */
export function looksLikeAuth0Token(token) {
  try {
    const decoded = jwt.decode(String(token || ''), { complete: true });
    return (
      decoded?.header?.alg === 'RS256' &&
      String(decoded?.payload?.iss || '').includes('auth0.com')
    );
  } catch {
    return false;
  }
}

/** Esegue il middleware Auth0 in modo programmatico. */
export function runAuth0Validation(req, res) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else if (res.headersSent) reject(Object.assign(new Error('Unauthorized'), { status: 401 }));
      else resolve(req.auth);
    };
    getValidator()(req, res, done);
  });
}

export function getAuth0PublicConfig() {
  return {
    domain: process.env.AUTH0_DOMAIN?.trim() || null,
    clientId:
      process.env.AUTH0_CLIENT_ID?.trim() ||
      process.env.VITE_AUTH0_CLIENT_ID?.trim() ||
      null,
    audience: process.env.AUTH0_AUDIENCE?.trim() || null,
    mfaEnabled: process.env.AUTH0_MFA_ENABLED === 'true',
  };
}

/** Estrae email/nome/MFA dal payload Auth0. */
export function profileFromAuth0Payload(payload = {}) {
  const amr = payload.amr;
  const mfaUsed = Array.isArray(amr) && amr.some((v) => /mfa|otp|sms|email/i.test(String(v)));
  return {
    auth0Id: payload.sub,
    email: payload.email || payload['https://marketmonitor/email'] || null,
    name: payload.name || payload.nickname || null,
    mfaVerified: mfaUsed || payload['https://marketmonitor/mfa'] === true,
  };
}
