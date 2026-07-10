import { getDb } from '../db.js';
import { isValidSlackWebhook } from '../notifications/slack.js';
import { enrichQuoteWithEur } from '../quoteEnrich.js';
import { avgPriceAfterBuy, calcPosition, sumDashboard } from './math.js';
import { BASE_CURRENCY, inferPositionCurrency, toBaseCurrency } from './currency.js';
import { inferAssetType } from './inferType.js';

function parsePositive(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} deve essere un numero positivo`);
  return n;
}

function parseOptionalPercent(value, allowNegative = false) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Soglia alert non valida');
  if (!allowNegative && n < 0) throw new Error('Soglia guadagno deve essere positiva');
  return n;
}

function parseLossPercent(value) {
  const n = parseOptionalPercent(value, true);
  if (n != null && n > 0) {
    throw new Error('Soglia perdita deve essere zero o negativa (es. -10)');
  }
  return n;
}

export { enrichAssets };

async function getAssetRow(userId, symbol) {
  const db = getDb();
  const sym = String(symbol).trim().toUpperCase();
  const rows = await db`
    SELECT * FROM portfolio_assets
    WHERE user_id = ${userId} AND symbol = ${sym}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function enrichAssets(assets, { getCachedMarket, loadFx }) {
  if (!assets.length) return [];

  const fx = loadFx ? await loadFx() : null;
  const enriched = [];

  for (const asset of assets) {
    let market = null;
    let quote = null;
    try {
      market = await getCachedMarket(asset.symbol, asset.asset_type, {
        minPoints: 0,
        allowStale: true,
      });
      quote = market?.quote ? enrichQuoteWithEur(market.quote, fx) : null;
    } catch {
      /* prezzo non disponibile */
    }

    const currentPrice = quote?.price != null ? Number(quote.price) : null;
    const currency = inferPositionCurrency(quote, asset.asset_type, asset.symbol);
    const metrics = calcPosition({
      quantity: asset.quantity,
      avgPrice: asset.avg_price,
      currentPrice,
    });

    const costBasisBase = toBaseCurrency(metrics.costBasis, currency, fx);
    const currentValueBase =
      metrics.currentValue != null ? toBaseCurrency(metrics.currentValue, currency, fx) : null;
    const plBase =
      currentValueBase != null && costBasisBase != null
        ? currentValueBase - costBasisBase
        : null;

    const sparkPoints =
      market?.series?.length > 1
        ? market.series.slice(-8).map((p) => ({ price: Number(p.price) }))
        : [];

    enriched.push({
      id: asset.id,
      symbol: asset.symbol,
      assetType: asset.asset_type,
      quantity: Number(asset.quantity),
      avgPrice: Number(asset.avg_price),
      alertGain: asset.alert_gain != null ? Number(asset.alert_gain) : null,
      alertLoss: asset.alert_loss != null ? Number(asset.alert_loss) : null,
      createdAt: asset.created_at,
      quote,
      currency,
      currentPrice,
      ...metrics,
      costBasisBase,
      currentValueBase,
      plBase,
      sparkPoints,
    });
  }

  return enriched;
}

export async function addAsset(
  userId,
  { symbol, assetType, quantity, avgPrice, alertGain, alertLoss }
) {
  const db = getDb();
  const sym = String(symbol).trim().toUpperCase();
  const type = inferAssetType(sym, assetType);
  const qty = parsePositive(quantity, 'Quantità');
  const price = parsePositive(avgPrice, 'Prezzo medio');
  const gain = parseOptionalPercent(alertGain);
  const loss = parseLossPercent(alertLoss);

  const existing = await getAssetRow(userId, sym);
  if (existing) {
    const result = await addTransaction(userId, {
      symbol: sym,
      assetType: type,
      type: 'buy',
      quantity: qty,
      price,
    });
    if (gain != null || loss != null) {
      await db`
        UPDATE portfolio_assets
        SET alert_gain = COALESCE(${gain}, alert_gain),
            alert_loss = COALESCE(${loss}, alert_loss)
        WHERE user_id = ${userId} AND symbol = ${sym}
      `;
    }
    return result;
  }

  const assetRows = await db`
    INSERT INTO portfolio_assets (
      user_id, symbol, asset_type, quantity, avg_price, alert_gain, alert_loss
    )
    VALUES (${userId}, ${sym}, ${type}, ${qty}, ${price}, ${gain}, ${loss})
    RETURNING *
  `;
  const asset = assetRows[0];

  await db`
    INSERT INTO transactions (asset_id, type, quantity, price)
    VALUES (${asset.id}, 'buy', ${qty}, ${price})
  `;

  return { asset, created: true };
}

export async function updateAssetAlerts(userId, symbol, { alertGain, alertLoss }) {
  const db = getDb();
  const sym = String(symbol).trim().toUpperCase();
  const asset = await getAssetRow(userId, sym);
  if (!asset) throw new Error('Asset non presente nel portfolio');

  const gain =
    alertGain === undefined ? asset.alert_gain : parseOptionalPercent(alertGain);
  const loss = alertLoss === undefined ? asset.alert_loss : parseLossPercent(alertLoss);

  const rows = await db`
    UPDATE portfolio_assets
    SET alert_gain = ${gain}, alert_loss = ${loss}
    WHERE user_id = ${userId} AND symbol = ${sym}
    RETURNING *
  `;
  return rows[0];
}

export async function addTransaction(
  userId,
  { symbol, assetType, type, quantity, price }
) {
  const db = getDb();
  const sym = String(symbol).trim().toUpperCase();
  const txType = String(type).toLowerCase();
  if (txType !== 'buy' && txType !== 'sell') {
    throw new Error("type deve essere 'buy' o 'sell'");
  }

  const qty = parsePositive(quantity, 'Quantità');
  const unitPrice = parsePositive(price, 'Prezzo');

  const execute = async (attempt = 0) => {
    let asset = await getAssetRow(userId, sym);

    if (!asset) {
      if (txType === 'sell') throw new Error('Asset non presente nel portfolio');
      try {
        const resolvedType = inferAssetType(sym, assetType);
        const assetRows = await db`
          INSERT INTO portfolio_assets (user_id, symbol, asset_type, quantity, avg_price)
          VALUES (${userId}, ${sym}, ${resolvedType}, 0, 0)
          RETURNING *
        `;
        asset = assetRows[0];
      } catch (err) {
        if (err?.code === '23505' && attempt < 2) return execute(attempt + 1);
        throw err;
      }
    }

    let updatedRows;
    if (txType === 'buy') {
      const newQty = Number(asset.quantity) + qty;
      const newAvg = avgPriceAfterBuy(asset.quantity, asset.avg_price, qty, unitPrice);
      updatedRows = await db`
        UPDATE portfolio_assets
        SET quantity = ${newQty}, avg_price = ${newAvg}
        WHERE id = ${asset.id} AND user_id = ${userId}
        RETURNING *
      `;
    } else {
      updatedRows = await db`
        UPDATE portfolio_assets
        SET
          quantity = quantity - ${qty},
          avg_price = CASE WHEN quantity - ${qty} > 0 THEN avg_price ELSE 0 END
        WHERE id = ${asset.id}
          AND user_id = ${userId}
          AND quantity >= ${qty}
        RETURNING *
      `;
    }

    if (!updatedRows.length) {
      if (txType === 'sell') {
        throw new Error('Quantità in vendita superiore al saldo');
      }
      throw new Error('Aggiornamento asset fallito');
    }

    await db`
      INSERT INTO transactions (asset_id, type, quantity, price)
      VALUES (${updatedRows[0].id}, ${txType}, ${qty}, ${unitPrice})
    `;

    return { asset: updatedRows[0], transactionType: txType };
  };

  return execute();
}

export async function getAssets(userId, deps) {
  const db = getDb();
  const rows = await db`
    SELECT * FROM portfolio_assets
    WHERE user_id = ${userId} AND quantity > 0
    ORDER BY symbol ASC
  `;
  return enrichAssets(rows, deps);
}

export async function getAssetDetail(userId, symbol, deps) {
  const db = getDb();
  const sym = String(symbol).trim().toUpperCase();
  const asset = await getAssetRow(userId, sym);
  if (!asset) return null;

  const transactions = await db`
    SELECT * FROM transactions
    WHERE asset_id = ${asset.id}
    ORDER BY date DESC
  `;

  const [enriched] = await enrichAssets([asset], deps);

  return {
    ...enriched,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      quantity: Number(t.quantity),
      price: Number(t.price),
      date: t.date,
      total: Number(t.quantity) * Number(t.price),
    })),
  };
}

export async function getDashboard(userId, deps) {
  const positions = await getAssets(userId, deps);
  const summary = sumDashboard(positions);
  return { summary, positions };
}

const HISTORY_RANGES = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  MAX: null,
};

/** Ultimo snapshot per ogni giorno (evita rumore da insert ogni 5 min). */
function downsampleHistoryByDay(rows) {
  const byDay = new Map();
  for (const row of rows) {
    const day = new Date(row.date).toISOString().slice(0, 10);
    byDay.set(day, row);
  }
  return [...byDay.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

export async function getPortfolioHistory(userId, range = '1M') {
  const db = getDb();
  const days = HISTORY_RANGES[range] ?? HISTORY_RANGES['1M'];

  const rows =
    days == null
      ? await db`
          SELECT date, total_value, total_pl
          FROM portfolio_history
          WHERE user_id = ${userId}
          ORDER BY date ASC
        `
      : await db`
          SELECT date, total_value, total_pl
          FROM portfolio_history
          WHERE user_id = ${userId}
            AND date >= NOW() - (${String(days)} || ' days')::interval
          ORDER BY date ASC
        `;

  const mapped = rows.map((r) => ({
    date: r.date,
    totalValue: Number(r.total_value),
    totalPl: r.total_pl != null ? Number(r.total_pl) : null,
  }));

  return downsampleHistoryByDay(mapped);
}

export async function registerTelegram(userId, chatId) {
  const db = getDb();
  const id = String(chatId || '').trim();
  if (!id) throw new Error('telegram_chat_id richiesto');
  await db`UPDATE users SET telegram_chat_id = ${id} WHERE id = ${userId}`;
  return { ok: true, telegram_chat_id: id };
}

export async function registerWhatsApp(userId, phoneNumber) {
  const db = getDb();
  let num = String(phoneNumber || '').trim().replace(/\s/g, '');
  if (!num) throw new Error('whatsapp_number richiesto');
  if (!num.startsWith('+')) num = `+${num}`;
  await db`UPDATE users SET whatsapp_number = ${num} WHERE id = ${userId}`;
  return { ok: true, whatsapp_number: num };
}

export async function registerSlack(userId, webhookUrl) {
  const db = getDb();
  const url = String(webhookUrl || '').trim();
  // Stringa vuota → disattiva il canale.
  if (!url) {
    await db`UPDATE users SET slack_webhook_url = NULL WHERE id = ${userId}`;
    return { ok: true, slack_webhook_url: null };
  }
  if (!isValidSlackWebhook(url)) {
    throw new Error('URL webhook Slack non valido (atteso https://hooks.slack.com/services/…)');
  }
  await db`UPDATE users SET slack_webhook_url = ${url} WHERE id = ${userId}`;
  return { ok: true, slack_webhook_url: url };
}

export async function setEmailAlerts(userId, enabled) {
  const db = getDb();
  const on = enabled === true || enabled === 'true' || enabled === 1 || enabled === '1';
  await db`UPDATE users SET email_alerts = ${on} WHERE id = ${userId}`;
  return { ok: true, email_alerts: on };
}
