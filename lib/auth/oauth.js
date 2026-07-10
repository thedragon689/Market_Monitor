/**
 * OAuth social login — Google (ID token), GitHub (code o access token).
 */
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { issueTokenPair } from '../portfolio/auth.js';
import { auditLog } from '../auditLog.js';

async function verifyGoogleIdToken(idToken) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new Error('Token Google non valido');
  const data = await res.json();
  const clientId =
    process.env.GOOGLE_CLIENT_ID?.trim() || process.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID non configurato');
  if (data.aud !== clientId) throw new Error('Audience Google non valida');
  if (!data.email) throw new Error('Email Google mancante');
  return { email: data.email.toLowerCase(), name: data.name, providerId: data.sub };
}

async function exchangeGitHubCode(code, redirectUri) {
  const clientId =
    process.env.GITHUB_CLIENT_ID?.trim() || process.env.VITE_GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID/SECRET non configurati per il flusso authorization code');
  }
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: String(code),
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Scambio code GitHub fallito');
  }
  if (!data.access_token) throw new Error('Access token GitHub mancante');
  return verifyGitHubAccessToken(data.access_token);
}

async function verifyGitHubAccessToken(accessToken) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'MarketMonitor/1.0',
    },
  });
  if (!res.ok) throw new Error('Token GitHub non valido');
  const user = await res.json();
  let email = user.email;
  if (!email) {
    const er = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'MarketMonitor/1.0',
      },
    });
    if (er.ok) {
      const emails = await er.json();
      email = emails.find((e) => e.primary && e.verified)?.email || emails[0]?.email;
    }
  }
  if (!email) throw new Error('Email GitHub non disponibile (visibilità privata)');
  return { email: email.toLowerCase(), name: user.name || user.login, providerId: String(user.id) };
}

async function findOrCreateOAuthUser(provider, profile) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');

  const oauthRows = await db`
    SELECT u.id, u.email FROM oauth_accounts o
    JOIN users u ON u.id = o.user_id
    WHERE o.provider = ${provider} AND o.provider_user_id = ${profile.providerId}
    LIMIT 1
  `;
  if (oauthRows[0]) return oauthRows[0];

  if (!profile.email) {
    throw new Error('Email non disponibile dal provider OAuth. Usa email/password.');
  }

  const existing = await db`SELECT id, email, email_verified FROM users WHERE email = ${profile.email} LIMIT 1`;
  let userId;
  if (existing[0]) {
    const oauthLinked = await db`
      SELECT 1 FROM oauth_accounts
      WHERE user_id = ${existing[0].id} AND provider = ${provider}
      LIMIT 1
    `;
    if (!existing[0].email_verified && !oauthLinked.length) {
      throw new Error(
        'Account email già registrato con password. Accedi con password o verifica l\'email prima di collegare OAuth.'
      );
    }
    userId = existing[0].id;
  } else {
    const hash = await bcrypt.hash(`oauth:${provider}:${profile.providerId}`, 10);
    const inserted = await db`
      INSERT INTO users (email, password_hash, email_verified)
      VALUES (${profile.email}, ${hash}, TRUE)
      RETURNING id, email
    `;
    userId = inserted[0].id;
  }

  await db`
    INSERT INTO oauth_accounts (user_id, provider, provider_user_id, profile)
    VALUES (${userId}, ${provider}, ${profile.providerId}, ${JSON.stringify({ name: profile.name })})
    ON CONFLICT (provider, provider_user_id) DO NOTHING
  `;

  return { id: userId, email: profile.email };
}

/**
 * @param {string} provider
 * @param {string} token — ID token Google o access token GitHub
 * @param {{ code?: string, redirectUri?: string }} [opts] — flusso GitHub via authorization code
 */
export async function loginWithOAuth(provider, token, opts = {}) {
  const p = String(provider).toLowerCase();
  let profile;
  if (p === 'google') profile = await verifyGoogleIdToken(token);
  else if (p === 'github') {
    profile = opts.code
      ? await exchangeGitHubCode(opts.code, opts.redirectUri)
      : await verifyGitHubAccessToken(token);
  } else throw new Error('Provider OAuth non supportato');

  const user = await findOrCreateOAuthUser(p, profile);
  const tokens = await issueTokenPair(user.id);
  await auditLog(user.id, 'auth.oauth', { provider: p });
  return { user: { id: user.id, email: user.email }, ...tokens };
}

export function isOAuthConfigured(provider) {
  const pub = getOAuthPublicConfig();
  const p = String(provider).toLowerCase();
  if (p === 'google') return Boolean(pub.google);
  if (p === 'github') {
    return Boolean(pub.github && process.env.GITHUB_CLIENT_SECRET?.trim());
  }
  return false;
}

/** ID client esposti al frontend (nessun segreto). */
export function getOAuthPublicConfig() {
  return {
    google: process.env.GOOGLE_CLIENT_ID?.trim() || process.env.VITE_GOOGLE_CLIENT_ID?.trim() || '',
    github: process.env.GITHUB_CLIENT_ID?.trim() || process.env.VITE_GITHUB_CLIENT_ID?.trim() || '',
  };
}
