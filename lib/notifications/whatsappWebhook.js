import { registerWhatsApp } from '../portfolio/service.js';
import { sendWhatsAppCloud } from './sendWhatsAppCloud.js';
import { verifyTelegramInternalRequest } from './telegramBot.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

function toE164(from) {
  const digits = String(from || '').replace(/\D/g, '');
  if (!digits) return null;
  return `+${digits}`;
}

function extractStartPayload(text) {
  const raw = String(text || '').trim();
  if (!raw.startsWith('/start')) return null;
  const parts = raw.split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ').trim() : '';
}

export function getWhatsAppBusinessNumber() {
  const raw =
    process.env.WHATSAPP_BUSINESS_NUMBER?.trim() ||
    process.env.WHATSAPP_DISPLAY_NUMBER?.trim() ||
    '';
  return raw.replace(/\D/g, '') || null;
}

/** Link wa.me con messaggio /start <userId> per collegamento automatico. */
export function createWhatsAppLinkForUser(userId) {
  const business = getWhatsAppBusinessNumber();
  if (!business) {
    return { userId, deepLink: null, businessNumber: null, startPayload: userId };
  }
  const text = encodeURIComponent(`/start ${userId}`);
  return {
    userId,
    deepLink: `https://wa.me/${business}?text=${text}`,
    businessNumber: business,
    startPayload: userId,
  };
}

/**
 * Verifica webhook Meta (GET hub.challenge).
 * @returns {{ status: number, body?: string }}
 */
export function handleWhatsAppWebhookVerify(req) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return { status: 200, body: String(challenge) };
  }
  return { status: 403 };
}

/**
 * Messaggi in entrata Meta — /start <userId> salva whatsapp_number nel DB.
 * @returns {Promise<{ status: number }>}
 */
export async function handleWhatsAppWebhook(req) {
  const body = req.body ?? {};
  const entries = Array.isArray(body.entry) ? body.entry : [];

  try {
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const messages = change.value?.messages;
        if (!Array.isArray(messages)) continue;

        for (const msg of messages) {
          const from = msg.from;
          const text = msg.text?.body;
          if (!from || typeof text !== 'string') continue;

          const payload = extractStartPayload(text);
          if (!payload) continue;

          const phone = toE164(from);
          if (!phone) continue;

          if (!isUuid(payload)) {
            await sendWhatsAppCloud(
              phone,
              '❌ Collegamento non riuscito. Usa il link "Attiva notifiche WhatsApp" nell’app.'
            ).catch(() => {});
            continue;
          }

          try {
            await registerWhatsApp(payload, phone);
            await sendWhatsAppCloud(
              phone,
              '🔔 Notifiche attivate! Ora riceverai gli alert del tuo portfolio su WhatsApp.'
            );
          } catch (err) {
            const msg = String(err.message || '');
            const reply = msg.includes('non trovato')
              ? '❌ Account non trovato. Registrati prima nell’app.'
              : '❌ Collegamento non riuscito. Riprova dall’app.';
            await sendWhatsAppCloud(phone, reply).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    console.error('[whatsapp-webhook]', err.message);
    return { status: 500 };
  }

  return { status: 200 };
}

export function verifyWhatsAppInternalRequest(req) {
  return verifyTelegramInternalRequest(req);
}
