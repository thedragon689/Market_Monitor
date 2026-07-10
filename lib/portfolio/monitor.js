import { getDb } from '../db.js';
import { sumDashboard } from './math.js';
import { enrichAssets } from './service.js';
import { listPushSubscriptions, deletePushByEndpoint } from './push.js';
import { buildLightForecast, buildLightAdvice } from './alertInsights.js';
import {
  dispatchPortfolioAlert,
  buildAlertMessages,
  buildForecastAlertMessages,
  buildAdviceAlertMessages,
  alertDelivered,
} from '../notifications/index.js';

const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h — evita spam ogni 5 min
const INSIGHT_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12h per previsioni e consigli

function shouldFireAlert(lastAt, cooldownMs = ALERT_COOLDOWN_MS) {
  if (!lastAt) return true;
  return Date.now() - new Date(lastAt).getTime() > cooldownMs;
}

async function fetchUser(userId) {
  const db = getDb();
  const rows = await db`
    SELECT id, email, telegram_chat_id, whatsapp_number, phone_number, slack_webhook_url,
      email_alerts, push_alerts_enabled,
      notify_gain, notify_loss, notify_forecast, notify_advice
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

async function markAlertSent(assetId, kind, extra = {}) {
  const db = getDb();
  if (kind === 'gain') {
    await db`
      UPDATE portfolio_assets SET last_gain_alert_at = NOW() WHERE id = ${assetId}
    `;
  } else if (kind === 'loss') {
    await db`
      UPDATE portfolio_assets SET last_loss_alert_at = NOW() WHERE id = ${assetId}
    `;
  } else if (kind === 'forecast') {
    await db`
      UPDATE portfolio_assets SET last_forecast_alert_at = NOW() WHERE id = ${assetId}
    `;
  } else if (kind === 'advice') {
    await db`
      UPDATE portfolio_assets
      SET last_advice_alert_at = NOW(), last_advice_action = ${extra.action ?? null}
      WHERE id = ${assetId}
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

    if (
      user.notify_gain !== false &&
      alertGain != null &&
      plPct >= alertGain &&
      shouldFireAlert(raw.last_gain_alert_at)
    ) {
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

    if (
      user.notify_loss !== false &&
      alertLoss != null &&
      plPct <= alertLoss &&
      shouldFireAlert(raw.last_loss_alert_at)
    ) {
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

    if (
      user.notify_forecast !== false &&
      shouldFireAlert(raw.last_forecast_alert_at, INSIGHT_COOLDOWN_MS)
    ) {
      const forecast = buildLightForecast(pos);
      if (forecast) {
        const messages = buildForecastAlertMessages({
          symbol: pos.symbol,
          trendPct: forecast.trendPct,
          trendLabel: forecast.trendLabel,
          direction: forecast.direction,
          currentPrice: pos.currentPrice,
          plPercent: plPct,
          currency,
        });
        const results = await dispatchPortfolioAlert(user, messages);
        await pruneExpiredPush(results, userId);
        if (alertDelivered(results)) {
          await markAlertSent(raw.id, 'forecast');
          alerts++;
        }
      }
    }

    if (
      user.notify_advice !== false &&
      shouldFireAlert(raw.last_advice_alert_at, INSIGHT_COOLDOWN_MS)
    ) {
      const advice = buildLightAdvice(pos);
      if (advice && raw.last_advice_action !== advice.action) {
        const messages = buildAdviceAlertMessages({
          symbol: pos.symbol,
          action: advice.action,
          actionLabel: advice.actionLabel,
          summary: advice.summary,
          plPercent: plPct,
        });
        const results = await dispatchPortfolioAlert(user, messages);
        await pruneExpiredPush(results, userId);
        if (alertDelivered(results)) {
          await markAlertSent(raw.id, 'advice', { action: advice.action });
          alerts++;
        }
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
