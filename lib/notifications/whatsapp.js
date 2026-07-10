/**
 * WhatsApp — supporta Twilio o Meta Cloud API.
 *
 * Twilio env:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (es. whatsapp:+14155238886)
 *
 * Meta Cloud API env:
 *   WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */
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

  const cloudToken = process.env.WHATSAPP_CLOUD_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (cloudToken && phoneId) {
    const to = normalized.replace(/^\+/, '');
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cloudToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error?.message || `WhatsApp Cloud HTTP ${res.status}`);
    }
    return { ok: true, provider: 'meta' };
  }

  return { ok: false, skipped: true, reason: 'whatsapp_not_configured' };
}
