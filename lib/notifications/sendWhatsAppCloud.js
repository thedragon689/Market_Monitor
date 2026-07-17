import axios from 'axios';

function resolveCloudToken() {
  return (
    process.env.WHATSAPP_CLOUD_TOKEN?.trim() ||
    process.env.WHATSPP_ACCESS_TOKEN?.trim() ||
    ''
  );
}

function resolvePhoneId() {
  return (
    process.env.WHATSAPP_CLOUD_PHONE_ID?.trim() ||
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
    ''
  );
}

export function isWhatsAppCloudConfigured() {
  return Boolean(resolveCloudToken() && resolvePhoneId());
}

/**
 * Invia un messaggio WhatsApp tramite Meta Cloud API.
 * @param {string} to — E.164 es. +393471234567 (il + è opzionale)
 * @param {string} message — testo piano
 */
export async function sendWhatsAppCloud(to, message) {
  const token = resolveCloudToken();
  const phoneId = resolvePhoneId();
  if (!token || !phoneId) {
    return { ok: false, skipped: true, reason: 'whatsapp_cloud_not_configured' };
  }

  const normalized = String(to || '').replace(/[\s\-().]/g, '');
  if (!normalized) {
    return { ok: false, skipped: true, reason: 'no_number' };
  }

  const recipient = normalized.startsWith('+') ? normalized.slice(1) : normalized;

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: String(message || '') },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );

    if (res.status < 200 || res.status >= 300) {
      const detail = res.data?.error?.message || JSON.stringify(res.data).slice(0, 160);
      throw new Error(detail || `WhatsApp Cloud HTTP ${res.status}`);
    }

    return { ok: true, provider: 'meta', data: res.data };
  } catch (err) {
    console.error('Errore invio WhatsApp Cloud API:', err.response?.data || err.message || err);
    throw err;
  }
}
