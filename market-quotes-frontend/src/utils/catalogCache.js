const LS_KEY = 'market-monitor-catalog-v1';
const TTL_MS = 3 * 60 * 1000;

export function getCatalogCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const row = JSON.parse(raw);
    if (!row?.storedAt || Date.now() - row.storedAt > TTL_MS * 4) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return {
      catalog: row.catalog ?? null,
      summary: row.summary ?? null,
      updatedAt: row.updatedAt ?? null,
      fx: row.fx ?? null,
      stale: Date.now() - row.storedAt > TTL_MS,
    };
  } catch {
    return null;
  }
}

export function setCatalogCache({ catalog, summary, updatedAt, fx }) {
  if (!catalog) return;
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        catalog,
        summary,
        updatedAt,
        fx,
        storedAt: Date.now(),
      })
    );
  } catch {
    /* quota */
  }
}

export function peekCatalogCache() {
  return getCatalogCache();
}
