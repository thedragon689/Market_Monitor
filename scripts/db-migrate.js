#!/usr/bin/env node
/**
 * Applica lo schema portfolio su NeonDB.
 * Richiede DATABASE_URL nel .env
 */
import dotenv from 'dotenv';
import path from 'path';
import { ensureSchema, isDbConfigured } from '../lib/db.js';

dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

if (!isDbConfigured()) {
  console.error('DATABASE_URL non impostato. Aggiungilo al file .env');
  process.exit(1);
}

try {
  await ensureSchema();
  console.log('Schema portfolio applicato con successo su NeonDB.');
} catch (err) {
  console.error('Errore migrazione:', err.message);
  process.exit(1);
}
