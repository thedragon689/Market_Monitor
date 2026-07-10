#!/usr/bin/env node
/**
 * Reset sessioni OAuth e 2FA portfolio (mantiene utenti e dati portfolio).
 * Richiede DATABASE_URL nel .env
 */
import dotenv from 'dotenv';
import path from 'path';
import { getDb, isDbConfigured } from '../lib/db.js';

dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

if (!isDbConfigured()) {
  console.error('DATABASE_URL non impostato.');
  process.exit(1);
}

const db = getDb();

const oauth = await db`DELETE FROM oauth_accounts RETURNING id`;
const refresh = await db`DELETE FROM refresh_tokens RETURNING id`;
const totp = await db`
  UPDATE users SET totp_enabled = FALSE, totp_secret = NULL
  WHERE totp_enabled = TRUE OR totp_secret IS NOT NULL
  RETURNING id
`;

console.log('Reset auth portfolio completato:');
console.log(`  oauth_accounts rimossi: ${oauth.length}`);
console.log(`  refresh_tokens rimossi: ${refresh.length}`);
console.log(`  utenti con 2FA disattivata: ${totp.length}`);
