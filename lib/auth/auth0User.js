import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { auditLog } from '../auditLog.js';

/**
 * Mappa un utente Auth0 (sub) al record locale Neon.
 * Crea l'utente se non esiste; collega per email se già registrato.
 */
export async function getOrCreateAuth0User({ auth0Id, email, name, mfaVerified = false }) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');

  const sub = String(auth0Id || '').trim();
  if (!sub) throw new Error('auth0_id mancante');

  const byAuth0 = await db`
    SELECT id, email, email_verified, mfa_verified
    FROM users WHERE auth0_id = ${sub} LIMIT 1
  `;
  if (byAuth0[0]) {
    if (mfaVerified && !byAuth0[0].mfa_verified) {
      await db`UPDATE users SET mfa_verified = TRUE WHERE id = ${byAuth0[0].id}`;
    }
    return byAuth0[0];
  }

  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
  if (normalizedEmail) {
    const byEmail = await db`
      SELECT id, email, auth0_id FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `;
    if (byEmail[0]) {
      await db`
        UPDATE users
        SET auth0_id = ${sub},
            email_verified = TRUE,
            mfa_verified = ${Boolean(mfaVerified)}
        WHERE id = ${byEmail[0].id}
      `;
      await auditLog(byEmail[0].id, 'auth.auth0.link');
      return { id: byEmail[0].id, email: byEmail[0].email };
    }
  }

  if (!normalizedEmail) {
    throw new Error(
      'Profilo Auth0 senza email. Abilita lo scope email e riprova, oppure usa email/password.'
    );
  }

  const hash = await bcrypt.hash(`auth0:${sub}`, 10);
  const inserted = await db`
    INSERT INTO users (email, password_hash, email_verified, auth0_id, mfa_verified)
    VALUES (${normalizedEmail}, ${hash}, TRUE, ${sub}, ${Boolean(mfaVerified)})
    RETURNING id, email, email_verified, mfa_verified
  `;
  await auditLog(inserted[0].id, 'auth.auth0.register', { name: name || null });
  return inserted[0];
}
