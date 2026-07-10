/**
 * Notifiche Slack via Incoming Webhook (per-utente).
 * L'URL webhook è configurato dall'utente (https://hooks.slack.com/services/...).
 * Nessuna env server necessaria: mirror del contratto degli altri adapter.
 */
export async function sendSlack(webhookUrl, text) {
  const url = String(webhookUrl || '').trim();
  if (!url) return { ok: false, skipped: true, reason: 'slack_not_configured' };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Slack HTTP ${res.status}: ${body.slice(0, 120)}`);
  }
  return { ok: true };
}

/** Valida un URL webhook Slack. */
export function isValidSlackWebhook(url) {
  return /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+$/.test(String(url || '').trim());
}
