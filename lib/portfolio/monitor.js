import { getDb } from '../db.js';
import { sumDashboard } from './math.js';
import { enrichAssets } from './service.js';
import { listPushSubscriptions, deletePushByEndpoint } from './push.js';
import {
  dispatchPortfolioAlert,
  buildAlertMessages,
  alertDelivered,
} from '../notifications/index.js';

const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h — evita spam ogni 5 min

function shouldFireAlert(lastAt) {
  if (!lastAt) return true;
  return Date.now() - new Date(lastAt).getTime() > ALERT_COOLDOWN_MS;
}

async function fetchUser(userId) {
  const db = getDb();
  const rows = await db`
    SELECT id, email, telegram_chat_id, whatsapp_number, slack_webhook_url, email_alerts
    FROM users WHERE id = ${userId}
  `;
  const user = rows[0] ?? null;
  if (user) {
    user.pushSubscriptions = await listPushSubscriptions(userId).catch(() => []);
  }
  return user;
}

/** Rimuove le subscription scadute segnalate dai canali push. */
async function pruneExpiredPush(results, userId) {
  for (const endpoint of results?.expiredEndpoints ?? []) {
    await deletePushByEndpoint(endpoint, userId).catch(() => {});
  }
}

async function saveHistorySnapshot(userId, summary) {
  if (summary.totalValue == null) return;
  if (summary.partial) {
    // Non persistere P/L fuorviante quando mancano prezzi live.
    summary = { ...summary, totalPl: null };
  }
  const db = getDb();

  const updated = await db`
    UPDATE portfolio_history
    SET
      total_value = ${summary.totalValue},
      total_pl = ${summary.totalPl ?? null},
      date = NOW()
    WHERE user_id = ${userId}
      AND date_trunc('hour', date) = date_trunc('hour', NOW()::timestamptz)
    RETURNING id
  `;

  if (updated.length) return;

  await db`
    INSERT INTO portfolio_history (user_id, total_value, total_pl)
    VALUES (${userId}, ${summary.totalValue}, ${summary.totalPl ?? null})
  `;
}

async function markAlertSent(assetId, kind) {
  const db = getDb();
  if (kind === 'gain') {
    await db`
      UPDATE portfolio_assets SET last_gain_alert_at = NOW() WHERE id = ${assetId}
    `;
  } else {
    await db`
      UPDATE portfolio_assets SET last_loss_alert_at = NOW() WHERE id = ${assetId}
    `;
  }
}

async function processUserPortfolio(userId, deps) {
  const db = getDb();
  const user = await fetchUser(userId);
  if (!user) return { userId, alerts: 0 };

  const rows = await db`
    SELECT * FROM portfolio_assets
    WHERE user_id = ${userId} AND quantity > 0
  `;
  if (!rows.length) return { userId, alerts: 0 };

  const positions = await enrichAssets(rows, deps);
  const summary = sumDashboard(positions);
  await saveHistorySnapshot(userId, summary);

  let alerts = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const pos = positions[i];
    if (pos.plPercent == null) continue;

    const plPct = Number(pos.plPercent);
    const alertGain = raw.alert_gain != null ? Number(raw.alert_gain) : null;
    const alertLoss = raw.alert_loss != null ? Number(raw.alert_loss) : null;
    const currency = pos.currency || 'USD';

    if (alertGain != null && plPct >= alertGain && shouldFireAlert(raw.last_gain_alert_at)) {
      const messages = buildAlertMessages({
        symbol: pos.symbol,
        plPercent: plPct,
        currentValue: pos.currentValue,
        avgPrice: pos.avgPrice,
        currentPrice: pos.currentPrice,
        pl: pos.pl,
        quantity: pos.quantity,
        threshold: alertGain,
        kind: 'gain',
        currency,
        sparkPoints: pos.sparkPoints,
        createdAt: pos.createdAt,
      });
      const results = await dispatchPortfolioAlert(user, messages);
      await pruneExpiredPush(results, userId);
      if (alertDelivered(results)) {
        await markAlertSent(raw.id, 'gain');
        alerts++;
      }
    }

    if (alertLoss != null && plPct <= alertLoss && shouldFireAlert(raw.last_loss_alert_at)) {
      const messages = buildAlertMessages({
        symbol: pos.symbol,
        plPercent: plPct,
        currentValue: pos.currentValue,
        avgPrice: pos.avgPrice,
        currentPrice: pos.currentPrice,
        pl: pos.pl,
        quantity: pos.quantity,
        threshold: alertLoss,
        kind: 'loss',
        currency,
        sparkPoints: pos.sparkPoints,
        createdAt: pos.createdAt,
      });
      const results = await dispatchPortfolioAlert(user, messages);
      await pruneExpiredPush(results, userId);
      if (alertDelivered(results)) {
        await markAlertSent(raw.id, 'loss');
        alerts++;
      }
    }
  }

  return { userId, alerts, totalValue: summary.totalValue };
}

/**
 * Cron job portfolio — legge asset, calcola P/L, invia alert, salva history.
 * @returns {{ users: number, alerts: number, durationMs: number }}
 */
export async function runPortfolioMonitor(deps) {
  const db = getDb();
  if (!db) throw new Error('DATABASE_URL non configurato');

  const start = Date.now();
  const userRows = await db`
    SELECT DISTINCT user_id FROM portfolio_assets WHERE quantity > 0
  `;

  let totalAlerts = 0;
  for (const { user_id } of userRows) {
    try {
      const result = await processUserPortfolio(user_id, deps);
      totalAlerts += result.alerts ?? 0;
    } catch (err) {
      console.error(`[portfolio-monitor] user ${user_id}:`, err.message);
    }
  }

  return {
    users: userRows.length,
    alerts: totalAlerts,
    durationMs: Date.now() - start,
  };
}
