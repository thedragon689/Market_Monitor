import { getDb } from '../db.js';

/** Soglia minima per registrare una variazione (evita rumore da tick). */
const MIN_DELTA_PCT = 0.05;
const MIN_DELTA_ABS = 0.01;

function toNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function directionFromDelta(delta) {
  if (delta > 0) return 'increase';
  if (delta < 0) return 'decrease';
  return 'unchanged';
}

/** Importanza = |Δ%| se disponibile, altrimenti |Δ valore|. */
export function computeImportance(deltaPercent, deltaValue) {
  const pct = toNum(deltaPercent);
  if (pct != null) return Math.abs(pct);
  const abs = toNum(deltaValue);
  return abs != null ? Math.abs(abs) : 0;
}

function significantChange(previous, current) {
  const prev = toNum(previous);
  const curr = toNum(current);
  if (curr == null) return false;
  if (prev == null) return true;
  const delta = curr - prev;
  if (Math.abs(delta) < MIN_DELTA_ABS) return false;
  if (prev === 0) return Math.abs(delta) >= MIN_DELTA_ABS;
  const pct = (delta / Math.abs(prev)) * 100;
  return Math.abs(pct) >= MIN_DELTA_PCT;
}

/**
 * Persiste una variazione asset o portfolio.
 * @returns {Promise<object|null>} riga inserita o null se non significativa
 */
export async function recordVariation({
  userId,
  assetId = null,
  symbol = null,
  scope = 'asset',
  previousValue,
  currentValue,
  previousPlPercent = null,
  currentPlPercent = null,
}) {
  const db = getDb();
  const prev = toNum(previousValue);
  const curr = toNum(currentValue);
  if (curr == null || prev == null) return null;
  if (!significantChange(prev, curr)) return null;

  const deltaValue = curr - prev;
  const deltaPercent = prev !== 0 ? (deltaValue / Math.abs(prev)) * 100 : null;
  const direction = directionFromDelta(deltaValue);
  const importance = computeImportance(deltaPercent, deltaValue);

  const rows = await db`
    INSERT INTO portfolio_variations (
      user_id, asset_id, symbol, scope, direction,
      previous_value, current_value, delta_value, delta_percent,
      previous_pl_percent, current_pl_percent, importance
    )
    VALUES (
      ${userId}, ${assetId}, ${symbol}, ${scope}, ${direction},
      ${prev}, ${curr}, ${deltaValue}, ${deltaPercent},
      ${toNum(previousPlPercent)}, ${toNum(currentPlPercent)}, ${importance}
    )
    RETURNING *
  `;
  return mapVariation(rows[0]);
}

export async function updateAssetSnapshot(assetId, { value, plPercent }) {
  const db = getDb();
  await db`
    UPDATE portfolio_assets
    SET
      last_value = ${toNum(value)},
      last_pl_percent = ${toNum(plPercent)},
      value_updated_at = NOW()
    WHERE id = ${assetId}
  `;
}

/**
 * Crea un evento notifica (inbox) collegato opzionalmente a una variazione.
 */
export async function createNotificationEvent({
  userId,
  assetId = null,
  variationId = null,
  kind,
  symbol = null,
  title,
  body = null,
  importance = 0,
  direction = 'neutral',
  payload = {},
  delivered = false,
}) {
  const db = getDb();
  const rows = await db`
    INSERT INTO notification_events (
      user_id, asset_id, variation_id, kind, symbol,
      title, body, importance, direction, payload, delivered
    )
    VALUES (
      ${userId}, ${assetId}, ${variationId}, ${kind}, ${symbol},
      ${title}, ${body}, ${importance}, ${direction},
      ${JSON.stringify(payload ?? {})}, ${Boolean(delivered)}
    )
    RETURNING *
  `;
  return mapNotification(rows[0]);
}

function mapVariation(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    assetId: row.asset_id,
    symbol: row.symbol,
    scope: row.scope,
    direction: row.direction,
    previousValue: toNum(row.previous_value),
    currentValue: toNum(row.current_value),
    deltaValue: toNum(row.delta_value),
    deltaPercent: toNum(row.delta_percent),
    previousPlPercent: toNum(row.previous_pl_percent),
    currentPlPercent: toNum(row.current_pl_percent),
    importance: toNum(row.importance) ?? 0,
    createdAt: row.created_at,
  };
}

function mapNotification(row) {
  if (!row) return null;
  let payload = row.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  return {
    id: row.id,
    userId: row.user_id,
    assetId: row.asset_id,
    variationId: row.variation_id,
    kind: row.kind,
    symbol: row.symbol,
    title: row.title,
    body: row.body,
    importance: toNum(row.importance) ?? 0,
    direction: row.direction ?? 'neutral',
    payload: payload ?? {},
    delivered: row.delivered === true,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/**
 * Variazioni ordinate per importanza (desc/asc) o tempo.
 * Query parametrizzate con rami fissi (niente ORDER BY dinamico non tipizzato).
 */
export async function getVariations(userId, { sort = 'importance_desc', limit = 50, direction = null } = {}) {
  const db = getDb();
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const dirFilter = direction === 'increase' || direction === 'decrease' ? direction : null;

  let rows;
  if (dirFilter && sort === 'importance_asc') {
    rows = await db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId} AND direction = ${dirFilter}
      ORDER BY importance ASC, created_at DESC
      LIMIT ${lim}
    `;
  } else if (dirFilter && sort === 'time_asc') {
    rows = await db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId} AND direction = ${dirFilter}
      ORDER BY created_at ASC
      LIMIT ${lim}
    `;
  } else if (dirFilter && sort === 'time_desc') {
    rows = await db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId} AND direction = ${dirFilter}
      ORDER BY created_at DESC
      LIMIT ${lim}
    `;
  } else if (dirFilter) {
    rows = await db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId} AND direction = ${dirFilter}
      ORDER BY importance DESC, created_at DESC
      LIMIT ${lim}
    `;
  } else if (sort === 'importance_asc') {
    rows = await db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId}
      ORDER BY importance ASC, created_at DESC
      LIMIT ${lim}
    `;
  } else if (sort === 'time_asc') {
    rows = await db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT ${lim}
    `;
  } else if (sort === 'time_desc') {
    rows = await db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${lim}
    `;
  } else {
    rows = await db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId}
      ORDER BY importance DESC, created_at DESC
      LIMIT ${lim}
    `;
  }

  return rows.map(mapVariation);
}

/**
 * Feed notifiche per il frontend — ordinato per importanza o cronologia progressiva.
 */
export async function getNotificationFeed(
  userId,
  { sort = 'importance_desc', limit = 40, unreadOnly = false } = {}
) {
  const db = getDb();
  const lim = Math.min(Math.max(Number(limit) || 40, 1), 200);

  let rows;
  if (unreadOnly && sort === 'importance_asc') {
    rows = await db`
      SELECT * FROM notification_events
      WHERE user_id = ${userId} AND read_at IS NULL
      ORDER BY importance ASC, created_at DESC
      LIMIT ${lim}
    `;
  } else if (unreadOnly && sort === 'time_asc') {
    rows = await db`
      SELECT * FROM notification_events
      WHERE user_id = ${userId} AND read_at IS NULL
      ORDER BY created_at ASC
      LIMIT ${lim}
    `;
  } else if (unreadOnly && sort === 'time_desc') {
    rows = await db`
      SELECT * FROM notification_events
      WHERE user_id = ${userId} AND read_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${lim}
    `;
  } else if (unreadOnly) {
    rows = await db`
      SELECT * FROM notification_events
      WHERE user_id = ${userId} AND read_at IS NULL
      ORDER BY importance DESC, created_at DESC
      LIMIT ${lim}
    `;
  } else if (sort === 'importance_asc') {
    rows = await db`
      SELECT * FROM notification_events
      WHERE user_id = ${userId}
      ORDER BY importance ASC, created_at DESC
      LIMIT ${lim}
    `;
  } else if (sort === 'time_asc') {
    rows = await db`
      SELECT * FROM notification_events
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT ${lim}
    `;
  } else if (sort === 'time_desc') {
    rows = await db`
      SELECT * FROM notification_events
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${lim}
    `;
  } else {
    rows = await db`
      SELECT * FROM notification_events
      WHERE user_id = ${userId}
      ORDER BY importance DESC, created_at DESC
      LIMIT ${lim}
    `;
  }

  return rows.map(mapNotification);
}

export async function markNotificationsRead(userId, ids = null) {
  const db = getDb();
  if (Array.isArray(ids) && ids.length) {
    await db`
      UPDATE notification_events
      SET read_at = NOW()
      WHERE user_id = ${userId} AND id = ANY(${ids}) AND read_at IS NULL
    `;
  } else {
    await db`
      UPDATE notification_events
      SET read_at = NOW()
      WHERE user_id = ${userId} AND read_at IS NULL
    `;
  }
  return { ok: true };
}

/**
 * Timeline progressiva: registrazione, inserimenti asset, transazioni, variazioni.
 * Ordinata per created_at ASC (cronologia) o DESC.
 */
export async function getPortfolioTimeline(userId, { order = 'asc', limit = 100 } = {}) {
  const db = getDb();
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 300);

  const rows =
    order === 'desc'
      ? await db`
          (
            SELECT
              'registration'::text AS event_type,
              u.created_at AS occurred_at,
              NULL::uuid AS ref_id,
              NULL::text AS symbol,
              jsonb_build_object('email', u.email) AS meta,
              0::numeric AS importance
            FROM users u
            WHERE u.id = ${userId}
          )
          UNION ALL
          (
            SELECT
              'asset_insert'::text,
              a.created_at,
              a.id,
              a.symbol,
              jsonb_build_object(
                'quantity', a.quantity,
                'avgPrice', a.avg_price,
                'assetType', a.asset_type
              ),
              0::numeric
            FROM portfolio_assets a
            WHERE a.user_id = ${userId}
          )
          UNION ALL
          (
            SELECT
              'transaction'::text,
              t.date,
              t.id,
              a.symbol,
              jsonb_build_object(
                'type', t.type,
                'quantity', t.quantity,
                'price', t.price
              ),
              0::numeric
            FROM transactions t
            INNER JOIN portfolio_assets a ON a.id = t.asset_id
            WHERE a.user_id = ${userId}
          )
          UNION ALL
          (
            SELECT
              'variation'::text,
              v.created_at,
              v.id,
              v.symbol,
              jsonb_build_object(
                'scope', v.scope,
                'direction', v.direction,
                'deltaValue', v.delta_value,
                'deltaPercent', v.delta_percent,
                'previousValue', v.previous_value,
                'currentValue', v.current_value
              ),
              v.importance
            FROM portfolio_variations v
            WHERE v.user_id = ${userId}
          )
          ORDER BY occurred_at DESC
          LIMIT ${lim}
        `
      : await db`
          (
            SELECT
              'registration'::text AS event_type,
              u.created_at AS occurred_at,
              NULL::uuid AS ref_id,
              NULL::text AS symbol,
              jsonb_build_object('email', u.email) AS meta,
              0::numeric AS importance
            FROM users u
            WHERE u.id = ${userId}
          )
          UNION ALL
          (
            SELECT
              'asset_insert'::text,
              a.created_at,
              a.id,
              a.symbol,
              jsonb_build_object(
                'quantity', a.quantity,
                'avgPrice', a.avg_price,
                'assetType', a.asset_type
              ),
              0::numeric
            FROM portfolio_assets a
            WHERE a.user_id = ${userId}
          )
          UNION ALL
          (
            SELECT
              'transaction'::text,
              t.date,
              t.id,
              a.symbol,
              jsonb_build_object(
                'type', t.type,
                'quantity', t.quantity,
                'price', t.price
              ),
              0::numeric
            FROM transactions t
            INNER JOIN portfolio_assets a ON a.id = t.asset_id
            WHERE a.user_id = ${userId}
          )
          UNION ALL
          (
            SELECT
              'variation'::text,
              v.created_at,
              v.id,
              v.symbol,
              jsonb_build_object(
                'scope', v.scope,
                'direction', v.direction,
                'deltaValue', v.delta_value,
                'deltaPercent', v.delta_percent,
                'previousValue', v.previous_value,
                'currentValue', v.current_value
              ),
              v.importance
            FROM portfolio_variations v
            WHERE v.user_id = ${userId}
          )
          ORDER BY occurred_at ASC
          LIMIT ${lim}
        `;

  return rows.map((r) => {
    let meta = r.meta;
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch {
        meta = {};
      }
    }
    return {
      eventType: r.event_type,
      occurredAt: r.occurred_at,
      refId: r.ref_id,
      symbol: r.symbol,
      meta: meta ?? {},
      importance: toNum(r.importance) ?? 0,
    };
  });
}

/**
 * Riepilogo per il pannello notifiche: top aumenti/diminuzioni + conteggi.
 */
export async function getNotificationInsights(userId) {
  const db = getDb();

  const [topIncreases, topDecreases, unreadCount, recent] = await Promise.all([
    db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId} AND direction = 'increase'
      ORDER BY importance DESC, created_at DESC
      LIMIT 5
    `,
    db`
      SELECT * FROM portfolio_variations
      WHERE user_id = ${userId} AND direction = 'decrease'
      ORDER BY importance DESC, created_at DESC
      LIMIT 5
    `,
    db`
      SELECT COUNT(*)::int AS c FROM notification_events
      WHERE user_id = ${userId} AND read_at IS NULL
    `,
    db`
      SELECT * FROM notification_events
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 10
    `,
  ]);

  return {
    unreadCount: unreadCount[0]?.c ?? 0,
    topIncreases: topIncreases.map(mapVariation),
    topDecreases: topDecreases.map(mapVariation),
    recent: recent.map(mapNotification),
  };
}
