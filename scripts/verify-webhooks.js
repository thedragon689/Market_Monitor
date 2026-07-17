/**
 * Smoke test per handler webhook Telegram/WhatsApp (senza DB né rete).
 */
import {
  handleWhatsAppWebhookVerify,
  createWhatsAppLinkForUser,
  getWhatsAppBusinessNumber,
} from '../lib/notifications/whatsappWebhook.js';
import {
  verifyTelegramInternalRequest,
  getTelegramInternalSecret,
} from '../lib/notifications/telegramBot.js';
import { isWhatsAppCloudConfigured } from '../lib/notifications/sendWhatsAppCloud.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log('OK:', msg);
}

const userId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test-verify';
const okVerify = handleWhatsAppWebhookVerify({
  query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'test-verify', 'hub.challenge': '12345' },
});
assert(okVerify.status === 200 && okVerify.body === '12345', 'WhatsApp verify challenge');

const badVerify = handleWhatsAppWebhookVerify({
  query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '12345' },
});
assert(badVerify.status === 403, 'WhatsApp verify rifiuta token errato');

process.env.WHATSAPP_BUSINESS_NUMBER = '+39 347 1234567';
assert(getWhatsAppBusinessNumber() === '393471234567', 'WhatsApp business number normalizzato');

const waLink = createWhatsAppLinkForUser(userId);
assert(waLink.startPayload === userId, 'WhatsApp link payload = userId');
assert(waLink.deepLink?.includes('393471234567'), 'WhatsApp deep link contiene numero business');
assert(waLink.deepLink?.includes(encodeURIComponent(`/start ${userId}`)), 'WhatsApp deep link precompila /start');

delete process.env.WHATSAPP_BUSINESS_NUMBER;
const waLinkNoBiz = createWhatsAppLinkForUser(userId);
assert(waLinkNoBiz.deepLink === null, 'WhatsApp deep link null senza business number');

process.env.TELEGRAM_INTERNAL_SECRET = 'internal-secret';
assert(getTelegramInternalSecret() === 'internal-secret', 'Telegram internal secret letto');

const authReq = {
  headers: { 'x-telegram-internal-secret': 'internal-secret' },
};
assert(verifyTelegramInternalRequest(authReq) === true, 'Telegram internal secret accettato');
assert(
  verifyTelegramInternalRequest({ headers: { 'x-telegram-internal-secret': 'bad' } }) === false,
  'Telegram internal secret rifiutato'
);

delete process.env.WHATSAPP_CLOUD_TOKEN;
delete process.env.WHATSAPP_PHONE_NUMBER_ID;
assert(isWhatsAppCloudConfigured() === false, 'WhatsApp Cloud non configurato senza env');

process.env.WHATSAPP_CLOUD_TOKEN = 'token';
process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
assert(isWhatsAppCloudConfigured() === true, 'WhatsApp Cloud configurato con token + phone id');

console.log('\nTutti i controlli webhook passati.');
