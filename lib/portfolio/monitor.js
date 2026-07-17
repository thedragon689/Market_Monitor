import { getDb } from '../db.js';
import { sumDashboard } from './math.js';
import { enrichAssets } from './service.js';
import { listPushSubscriptions, deletePushByEndpoint } from './push.js';
import { buildLightForecast, buildLightAdvice } from './alertInsights.js';
import {
  recordVariation,
  updateAssetSnapshot,
  createNotificationEvent,
  computeImportance,
} from './events.js';
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

  // Variazione portafoglio vs ultima variazione (o snapshot precedente)
  const lastPortVar = await db`
    SELECT current_value FROM portfolio_variations
    WHERE user_id = ${userId} AND scope = 'portfolio'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  let prevTotal =
    lastPortVar[0]?.current_value != null ? Number(lastPortVar[0].current_value) : null;
  if (prevTotal == null) {
    const prevHist = await db`
      SELECT total_value FROM portfolio_history
      WHERE user_id = ${userId}
      ORDER BY date DESC
      OFFSET 1
      LIMIT 1
    `;
    prevTotal = prevHist[0]?.total_value != null ? Number(prevHist[0].total_value) : null;
  }
  if (summary.totalValue != null) {
    const portfolioVar = await recordVariation({
      userId,
      scope: 'portfolio',
      previousValue: prevTotal,
      currentValue: summary.totalValue,
      previousPlPercent: null,
      currentPlPercent: summary.totalPlPercent ?? null,
    });
    if (portfolioVar) {
      const label = portfolioVar.direction === 'increase' ? 'Aumento' : 'Diminuzione';
      await createNotificationEvent({
        userId,
        variationId: portfolioVar.id,
        kind: portfolioVar.direction,
        title: `${label} portafoglio`,
        body: `Valore ${portfolioVar.previousValue?.toFixed?.(2) ?? '—'} → ${portfolioVar.currentValue?.toFixed?.(2) ?? '—'} (${portfolioVar.deltaPercent != null ? `${portfolioVar.deltaPercent >= 0 ? '+' : ''}${portfolioVar.deltaPercent.toFixed(2)}%` : 'n/d'})`,
        importance: portfolioVar.importance,
        direction: portfolioVar.direction,
        payload: { scope: 'portfolio', variationId: portfolioVar.id },
      });
    }
  }

  let alerts = 0;
  let variations = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const pos = positions[i];
    if (pos.plPercent == null) continue;

    const plPct = Number(pos.plPercent);
    const currentValue = pos.currentValue != null ? Number(pos.currentValue) : null;
    const alertGain = raw.alert_gain != null ? Number(raw.alert_gain) : null;
    const alertLoss = raw.alert_loss != null ? Number(raw.alert_loss) : null;
    const currency = pos.currency || 'USD';

    // Rileva aumento/diminuzione rispetto all'ultimo valore salvato
    if (currentValue != null) {
      const prevValue = raw.last_value != null ? Number(raw.last_value) : null;
      const prevPl = raw.last_pl_percent != null ? Number(raw.last_pl_percent) : null;
      const variation = await recordVariation({
        userId,
        assetId: raw.id,
        symbol: pos.symbol,
        scope: 'asset',
        previousValue: prevValue,
        currentValue,
        previousPlPercent: prevPl,
        currentPlPercent: plPct,
      });
      await updateAssetSnapshot(raw.id, { value: currentValue, plPercent: plPct });
      if (variation) {
        variations++;
        const label = variation.direction === 'increase' ? 'Aumento' : 'Diminuzione';
        await createNotificationEvent({
          userId,
          assetId: raw.id,
          variationId: variation.id,
          kind: variation.direction,
          symbol: pos.symbol,
          title: `${label} ${pos.symbol}`,
          body: `P/L ${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}% · Δ ${variation.deltaPercent != null ? `${variation.deltaPercent >= 0 ? '+' : ''}${variation.deltaPercent.toFixed(2)}%` : 'n/d'}`,
          importance: variation.importance,
          direction: variation.direction,
          payload: {
            plPercent: plPct,
            currentValue,
            deltaPercent: variation.deltaPercent,
            currency,
          },
        });
      }
    }

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
      const delivered = alertDelivered(results);
      if (delivered) {
        await markAlertSent(raw.id, 'gain');
        alerts++;
      }
      await createNotificationEvent({
        userId,
        assetId: raw.id,
        kind: 'gain',
        symbol: pos.symbol,
        title: `Soglia guadagno ${pos.symbol}`,
        body: `P/L +${plPct.toFixed(2)}% (soglia ${alertGain}%)`,
        importance: computeImportance(plPct - alertGain, pos.pl),
        direction: 'increase',
        delivered,
        payload: { plPercent: plPct, threshold: alertGain, currency },
      });
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
      const delivered = alertDelivered(results);
      if (delivered) {
        await markAlertSent(raw.id, 'loss');
        alerts++;
      }
      await createNotificationEvent({
        userId,
        assetId: raw.id,
        kind: 'loss',
        symbol: pos.symbol,
        title: `Soglia perdita ${pos.symbol}`,
        body: `P/L ${plPct.toFixed(2)}% (soglia ${alertLoss}%)`,
        importance: computeImportance(alertLoss - plPct, pos.pl),
        direction: 'decrease',
        delivered,
        payload: { plPercent: plPct, threshold: alertLoss, currency },
      });
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
        const delivered = alertDelivered(results);
        if (delivered) {
          await markAlertSent(raw.id, 'forecast');
          alerts++;
        }
        await createNotificationEvent({
          userId,
          assetId: raw.id,
          kind: 'forecast',
          symbol: pos.symbol,
          title: `Previsione ${pos.symbol}`,
          body: `${forecast.trendLabel} (${forecast.trendPct >= 0 ? '+' : ''}${Number(forecast.trendPct).toFixed(2)}%)`,
          importance: Math.abs(Number(forecast.trendPct) || 0),
          direction:
            forecast.direction === 'up'
              ? 'increase'
              : forecast.direction === 'down'
                ? 'decrease'
                : 'neutral',
          delivered,
          payload: forecast,
        });
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
        const delivered = alertDelivered(results);
        if (delivered) {
          await markAlertSent(raw.id, 'advice', { action: advice.action });
          alerts++;
        }
        await createNotificationEvent({
          userId,
          assetId: raw.id,
          kind: 'advice',
          symbol: pos.symbol,
          title: `Consiglio ${pos.symbol}`,
          body: `${advice.actionLabel}: ${advice.summary}`,
          importance: Math.abs(plPct),
          direction: 'neutral',
          delivered,
          payload: advice,
        });
      }
    }
  }

  return { userId, alerts, variations, totalValue: summary.totalValue };
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
  let totalVariations = 0;
  for (const { user_id } of userRows) {
    try {
      const result = await processUserPortfolio(user_id, deps);
      totalAlerts += result.alerts ?? 0;
      totalVariations += result.variations ?? 0;
    } catch (err) {
      console.error(`[portfolio-monitor] user ${user_id}:`, err.message);
    }
  }

  return {
    users: userRows.length,
    alerts: totalAlerts,
    variations: totalVariations,
    durationMs: Date.now() - start,
  };
}
