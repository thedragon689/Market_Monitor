import webpush from 'web-push';

let configured = false;

/** Inizializza web-push con le VAPID key da env (una sola volta). */
function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;

  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:alerts@market-monitor.app';
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isWebPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

/**
 * Invia una notifica push a una subscription.
 * @returns {{ ok: boolean, gone?: boolean, error?: string }}
 *   gone=true quando la subscription è scaduta (404/410) e va rimossa.
 */
export async function sendWebPush(subscription, payload, options = {}) {
  if (!ensureConfigured()) return { ok: false, error: 'VAPID non configurato' };
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const ttl = options.ttl ?? payload?.ttl ?? 86400;
  const urgency = options.urgency ?? payload?.urgency ?? 'normal';
  try {
    await webpush.sendNotification(subscription, body, { TTL: ttl, urgency });
    return { ok: true };
  } catch (err) {
    const status = err?.statusCode;
    if (status === 404 || status === 410) {
      return { ok: false, gone: true, error: 'subscription scaduta' };
    }
    return { ok: false, error: err?.message || 'invio push fallito' };
  }
}
