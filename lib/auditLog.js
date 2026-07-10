import { getDb } from './db.js';
import { logger } from './logger.js';

export async function auditLog(userId, action, meta = {}) {
  const db = getDb();
  const payload = {
    userId: userId ?? null,
    action: String(action).slice(0, 120),
    meta: meta && typeof meta === 'object' ? meta : { detail: meta },
    ts: new Date().toISOString(),
  };
  logger.info('audit', payload);
  if (!db || !userId) return;
  try {
    await db`
      INSERT INTO audit_logs (user_id, action, meta)
      VALUES (${userId}, ${payload.action}, ${JSON.stringify(payload.meta)})
    `;
  } catch (err) {
    logger.warn('audit.persist_failed', { error: err.message, action: payload.action });
  }
}

export async function listAuditLog(userId, limit = 50) {
  const db = getDb();
  if (!db) return [];
  const rows = await db`
    SELECT id, action, meta, created_at
    FROM audit_logs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${Math.min(Math.max(limit, 1), 200)}
  `;
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    meta: r.meta,
    createdAt: r.created_at,
  }));
}
