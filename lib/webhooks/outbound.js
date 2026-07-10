import { getDb } from '../db.js';
import { logger } from '../logger.js';
import { assertSafeOutboundUrl } from '../ssrfGuard.js';

const ALLOWED_EVENTS = new Set([
  'portfolio.alert',
  'portfolio.trade',
  'auth.login',
  'price.anomaly',
]);

export async function registerOutboundWebhook(userId, url, events = ['portfolio.alert']) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');
  const cleanUrl = await assertSafeOutboundUrl(url);
  const safeEvents = events.filter((e) => ALLOWED_EVENTS.has(e));
  if (!safeEvents.length) throw new Error('Nessun evento valido');

  await db`
    INSERT INTO outbound_webhooks (user_id, url, events)
    VALUES (${userId}, ${cleanUrl}, ${JSON.stringify(safeEvents)})
    ON CONFLICT (user_id, url) DO UPDATE SET events = EXCLUDED.events, updated_at = NOW()
  `;
  return { ok: true, url: cleanUrl, events: safeEvents };
}

export async function listOutboundWebhooks(userId) {
  const db = getDb();
  if (!db) return [];
  const rows = await db`
    SELECT id, url, events, created_at FROM outbound_webhooks WHERE user_id = ${userId}
  `;
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    events: r.events,
    createdAt: r.created_at,
  }));
}

export async function deleteOutboundWebhook(userId, id) {
  const db = getDb();
  if (!db) return;
  await db`DELETE FROM outbound_webhooks WHERE user_id = ${userId} AND id = ${id}`;
}

/** Invia evento a tutti i webhook utente registrati per quel tipo. */
export async function dispatchOutboundWebhook(userId, event, payload) {
  if (!ALLOWED_EVENTS.has(event)) return { sent: 0 };
  const db = getDb();
  if (!db) return { sent: 0 };

  const rows = await db`
    SELECT url, events FROM outbound_webhooks WHERE user_id = ${userId}
  `;
  const targets = rows.filter((r) => {
    const ev = Array.isArray(r.events) ? r.events : JSON.parse(r.events || '[]');
    return ev.includes(event);
  });

  let sent = 0;
  await Promise.all(
    targets.map(async (t) => {
      try {
        const safeUrl = await assertSafeOutboundUrl(t.url);
        const res = await fetch(safeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MarketMonitor-Event': event,
          },
          body: JSON.stringify({ event, ts: new Date().toISOString(), ...payload }),
        });
        if (res.ok) sent += 1;
      } catch (err) {
        logger.warn('webhook.dispatch_failed', { url: t.url, error: err.message });
      }
    })
  );
  return { sent };
}
