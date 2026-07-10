import { getDb } from '../db.js';

/** Estrae {endpoint, keys:{p256dh, auth}} da una subscription del browser. */
function parseSubscription(sub) {
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Subscription push non valida');
  }
  return { endpoint, p256dh, auth };
}

/** Salva (upsert) una subscription push per l'utente. */
export async function savePushSubscription(userId, sub) {
  const { endpoint, p256dh, auth } = parseSubscription(sub);
  const db = getDb();
  await db`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `;
  return { ok: true };
}

/** Elenca le subscription in formato pronto per web-push. */
export async function listPushSubscriptions(userId) {
  const db = getDb();
  const rows = await db`
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}
  `;
  return rows.map((r) => ({
    endpoint: r.endpoint,
    keys: { p256dh: r.p256dh, auth: r.auth },
  }));
}

/** Rimuove una subscription per endpoint (scoped per utente se userId fornito). */
export async function deletePushByEndpoint(endpoint, userId) {
  if (!endpoint) return { ok: false };
  const db = getDb();
  if (userId) {
    await db`
      DELETE FROM push_subscriptions
      WHERE user_id = ${userId} AND endpoint = ${endpoint}
    `;
  } else {
    await db`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
  }
  return { ok: true };
}
