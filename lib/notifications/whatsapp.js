/**
 * WhatsApp — supporta Twilio o Meta Cloud API.
 *
 * Twilio env:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (es. whatsapp:+14155238886)
 *
 * Meta Cloud API env:
 *   WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID (o WHATSAPP_CLOUD_PHONE_ID)
 */
import { sendWhatsAppCloud, isWhatsAppCloudConfigured } from './sendWhatsAppCloud.js';

export { sendWhatsAppCloud, isWhatsAppCloudConfigured };

export async function sendWhatsApp(toNumber, text) {
  const normalized = String(toNumber || '').replace(/\s/g, '');
  if (!normalized) return { ok: false, skipped: true, reason: 'no_number' };

  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (twilioSid && twilioToken && twilioFrom) {
    const to = normalized.startsWith('whatsapp:') ? normalized : `whatsapp:${normalized}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const body = new URLSearchParams({ From: twilioFrom, To: to, Body: text });
    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Twilio WhatsApp: ${errText.slice(0, 120)}`);
    }
    return { ok: true, provider: 'twilio' };
  }

  if (isWhatsAppCloudConfigured()) {
    return sendWhatsAppCloud(normalized, text);
  }

  return { ok: false, skipped: true, reason: 'whatsapp_not_configured' };
}
