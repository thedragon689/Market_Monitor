import { getDb } from '../db.js';
import { registerTelegram } from '../portfolio/service.js';
import { sendTelegram } from './telegram.js';

export { sendTelegram };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export function getTelegramInternalSecret() {
  return (
    process.env.TELEGRAM_INTERNAL_SECRET?.trim() ||
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    ''
  );
}

function verifyWebhookSecret(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  return req.headers['x-telegram-bot-api-secret-token'] === secret;
}

export function verifyTelegramInternalRequest(req) {
  const secret = getTelegramInternalSecret();
  if (!secret) return false;
  const hdr =
    req.headers['x-telegram-internal-secret'] ||
    req.headers['x-telegram-bot-api-secret-token'];
  return hdr === secret;
}

function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

/** Username del bot (env o getMe Telegram). */
export async function getTelegramBotUsername() {
  const fromEnv = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (fromEnv) return fromEnv.replace(/^@/, '');

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json().catch(() => ({}));
    return data?.result?.username ?? null;
  } catch {
    return null;
  }
}

async function assertUserExists(userId) {
  const db = getDb();
  const rows = await db`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
  if (!rows[0]) throw new Error('Utente non trovato');
  return rows[0].id;
}

/** Deep link /start con userId (UUID) — flusso post-registrazione. */
export async function createTelegramLinkForUser(userId) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');
  if (!isTelegramConfigured()) throw new Error('TELEGRAM_BOT_TOKEN non configurato');

  await assertUserExists(userId);

  const username = await getTelegramBotUsername();
  const deepLink = username ? `https://t.me/${username}?start=${userId}` : null;

  return {
    userId,
    deepLink,
    botUsername: username,
    startPayload: userId,
  };
}

/** @deprecated alias */
export async function createTelegramLinkCode(userId) {
  return createTelegramLinkForUser(userId);
}

async function linkTelegramByUserId(userId, chatId) {
  if (!isUuid(userId)) return { ok: false, reason: 'invalid_user_id' };
  try {
    await assertUserExists(userId);
    await registerTelegram(userId, String(chatId));
    return { ok: true, userId };
  } catch (err) {
    if (String(err.message).includes('non trovato')) {
      return { ok: false, reason: 'user_not_found' };
    }
    throw err;
  }
}

async function consumeTelegramLinkCode(code, chatId) {
  const db = getDb();
  if (!db) return { ok: false, reason: 'db_unavailable' };

  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return { ok: false, reason: 'missing_code' };

  const rows = await db`
    SELECT user_id, expires_at FROM telegram_link_codes
    WHERE code = ${normalized}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: false, reason: 'invalid_code' };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db`DELETE FROM telegram_link_codes WHERE code = ${normalized}`;
    return { ok: false, reason: 'expired_code' };
  }

  await registerTelegram(row.user_id, String(chatId));
  await db`DELETE FROM telegram_link_codes WHERE code = ${normalized}`;

  return { ok: true, userId: row.user_id };
}

function extractStartPayload(text) {
  const raw = String(text || '').trim();
  if (!raw.startsWith('/start')) return null;
  const parts = raw.split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ').trim() : '';
}

async function registerTelegramViaInternalApi(chatId, userId) {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/$/, '');
  const secret = getTelegramInternalSecret();
  if (!base || !secret) {
    return linkTelegramByUserId(userId, chatId);
  }

  try {
    const res = await fetch(`${base}/api/notifications/registerTelegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Internal-Secret': secret,
      },
      body: JSON.stringify({ chatId: String(chatId), userId }),
    });
    if (res.ok) return { ok: true, userId };
    if (res.status === 401) return linkTelegramByUserId(userId, chatId);
    const data = await res.json().catch(() => ({}));
    return { ok: false, reason: data.error || 'register_failed' };
  } catch {
    return linkTelegramByUserId(userId, chatId);
  }
}

/**
 * Handler webhook Telegram — POST /api/telegram/webhook
 * /start <userId> → salva chat_id su users.telegram_chat_id
 */
export async function handleTelegramWebhook(req) {
  if (!isTelegramConfigured()) {
    return { status: 503 };
  }
  if (!verifyWebhookSecret(req)) {
    return { status: 401 };
  }

  const message = req.body?.message;
  if (!message) return { status: 200 };

  const chatId = message.chat?.id;
  const text = message.text;
  if (chatId == null) return { status: 200 };

  try {
    if (typeof text === 'string' && text.startsWith('/start')) {
      const payload = extractStartPayload(text);

      if (payload && isUuid(payload)) {
        const linked = await registerTelegramViaInternalApi(chatId, payload);
        if (linked.ok) {
          await sendTelegram(
            chatId,
            '🔔 <b>Notifiche attivate!</b>\nOra riceverai gli alert del tuo portfolio su questo chat.'
          );
        } else if (linked.reason === 'user_not_found') {
          await sendTelegram(chatId, '❌ Account non trovato. Registrati prima nell’app.');
        } else {
          await sendTelegram(chatId, '❌ Collegamento non riuscito. Riprova dall’app.');
        }
      } else if (payload) {
        const linked = await consumeTelegramLinkCode(payload, chatId);
        if (linked.ok) {
          await sendTelegram(
            chatId,
            '🔔 <b>Notifiche attivate!</b>\nOra riceverai gli alert del tuo portfolio su questo chat.'
          );
        } else {
          await sendTelegram(
            chatId,
            '❌ Codice non valido. Usa <b>Attiva notifiche Telegram</b> nell’app.'
          );
        }
      } else {
        await sendTelegram(
          chatId,
          `👋 Ciao!\n\nIl tuo <b>Chat ID</b> è: <code>${chatId}</code>\n\n` +
            'Per collegare il portfolio usa <b>Attiva notifiche Telegram</b> nell’app dopo la registrazione.'
        );
      }
    }
  } catch (err) {
    console.error('[telegram-webhook]', err.message);
    return { status: 500 };
  }

  return { status: 200 };
}

/** Registra il webhook su Telegram (eseguire una volta per ambiente). */
export async function setTelegramWebhook(webhookUrl) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN mancante');

  const url = String(webhookUrl || '').trim();
  if (!url) throw new Error('URL webhook mancante');

  const body = { url };
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) body.secret_token = secret;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.description || `setWebhook HTTP ${res.status}`);
  }
  return data;
}
