import crypto from 'crypto';
import { getDb } from '../db.js';
import { sendEmail } from '../notifications/email.js';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.URL?.trim() ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
}

export async function issueEmailVerification(userId) {
  const db = getDb();
  if (!db) return null;

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`;
  await db`
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `;

  return token;
}

export async function verifyEmailByToken(token) {
  const db = getDb();
  if (!db || !token) throw new Error('Token non valido');

  const tokenHash = hashToken(token);
  const rows = await db`
    SELECT t.user_id, u.email
    FROM email_verification_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ${tokenHash}
      AND t.expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new Error('Token scaduto o non valido');

  await db`UPDATE users SET email_verified = TRUE WHERE id = ${row.user_id}`;
  await db`DELETE FROM email_verification_tokens WHERE user_id = ${row.user_id}`;

  return { userId: row.user_id, email: row.email };
}

export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${appBaseUrl()}/?view=portfolio&verifyEmail=${encodeURIComponent(token)}`;
  const subject = 'Verifica email — Market Monitor';
  const text =
    `Clicca per verificare la tua email:\n${verifyUrl}\n\n` +
    'Il link scade tra 24 ore.';
  const html =
    `<p>Verifica la tua email per Market Monitor:</p>` +
    `<p><a href="${verifyUrl}">Conferma email</a></p>` +
    `<p style="font-size:12px;color:#666">Il link scade tra 24 ore.</p>`;

  const result = await sendEmail(email, { subject, text, html });
  if (result.skipped) {
    console.warn('[email-verify] invio saltato:', result.reason);
  }
  return result;
}

export async function resendVerificationForUser(userId) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');

  const rows = await db`
    SELECT id, email, email_verified FROM users WHERE id = ${userId} LIMIT 1
  `;
  const user = rows[0];
  if (!user) throw new Error('Utente non trovato');
  if (user.email_verified) return { ok: true, alreadyVerified: true };

  const token = await issueEmailVerification(userId);
  await sendVerificationEmail(user.email, token);
  return { ok: true, sent: true };
}
