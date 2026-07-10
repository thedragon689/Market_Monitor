import { getDb } from './db.js';
import { auditLog } from './auditLog.js';

const DEFAULT_LAYOUT = [
  { id: 'quote', colSpan: 4 },
  { id: 'chart', colSpan: 8 },
  { id: 'indicators', colSpan: 4 },
  { id: 'correlations', colSpan: 4 },
  { id: 'forecast', colSpan: 4 },
  { id: 'alerts', colSpan: 4 },
];

export function defaultDashboardLayout() {
  return DEFAULT_LAYOUT;
}

export async function getDashboardLayout(userId) {
  const db = getDb();
  if (!db) return { layout: DEFAULT_LAYOUT, source: 'default' };
  const rows = await db`
    SELECT dashboard_layout FROM user_preferences WHERE user_id = ${userId} LIMIT 1
  `;
  const raw = rows[0]?.dashboard_layout;
  if (!raw) return { layout: DEFAULT_LAYOUT, source: 'default' };
  try {
    const layout = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(layout) || !layout.length) {
      return { layout: DEFAULT_LAYOUT, source: 'default' };
    }
    return { layout, source: 'server' };
  } catch {
    return { layout: DEFAULT_LAYOUT, source: 'default' };
  }
}

export async function saveDashboardLayout(userId, layout) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');
  if (!Array.isArray(layout)) throw new Error('layout deve essere un array');
  const safe = layout
    .filter((w) => w && typeof w.id === 'string')
    .map((w) => ({ id: w.id, colSpan: Math.min(12, Math.max(2, Number(w.colSpan) || 4)) }));
  const payload = safe.length ? safe : DEFAULT_LAYOUT;
  await db`
    INSERT INTO user_preferences (user_id, dashboard_layout, updated_at)
    VALUES (${userId}, ${JSON.stringify(payload)}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      dashboard_layout = EXCLUDED.dashboard_layout,
      updated_at = NOW()
  `;
  await auditLog(userId, 'dashboard.layout.save', { widgets: payload.length });
  return payload;
}
