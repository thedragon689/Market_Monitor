/**
 * Registra il webhook Telegram sul dominio configurato.
 * Uso: npm run telegram:set-webhook
 * Richiede: TELEGRAM_BOT_TOKEN, APP_BASE_URL
 */
import dotenv from 'dotenv';
import path from 'path';
import { setTelegramWebhook } from '../lib/notifications/telegramBot.js';

dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

const base = process.env.APP_BASE_URL?.trim().replace(/\/$/, '');
if (!base) {
  console.error('APP_BASE_URL mancante in .env');
  process.exit(1);
}

const webhookUrl = `${base}/api/telegram/webhook`;

try {
  const result = await setTelegramWebhook(webhookUrl);
  console.log('Webhook Telegram registrato:', webhookUrl);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Errore setWebhook:', err.message);
  process.exit(1);
}
