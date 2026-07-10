import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardLayout, hasPortfolioSessionSync, saveDashboardLayoutRemote } from '../utils/portfolioApi';
import { WIDGET_REGISTRY } from '../components/dashboard/widgetRegistry';

const STORAGE_KEY = 'mm:dashboard-layout';
const VALID_WIDGET_IDS = new Set(Object.keys(WIDGET_REGISTRY));

export const DEFAULT_WIDGETS = [
  { id: 'quote', colSpan: 4 },
  { id: 'chart', colSpan: 8 },
  { id: 'indicators', colSpan: 4 },
  { id: 'correlations', colSpan: 4 },
  { id: 'forecast', colSpan: 4 },
  { id: 'alerts', colSpan: 4 },
];

/** Evita dashboard vuota se localStorage/API contengono array vuoto o widget sconosciuti. */
export function normalizeDashboardLayout(layout) {
  if (!Array.isArray(layout) || !layout.length) return DEFAULT_WIDGETS;
  const filtered = layout
    .filter((item) => item && VALID_WIDGET_IDS.has(item.id))
    .map((item) => ({
      id: item.id,
      colSpan: Math.min(
        12,
        Math.max(2, Number(item.colSpan) || WIDGET_REGISTRY[item.id]?.defaultColSpan || 4)
      ),
    }));
  return filtered.length ? filtered : DEFAULT_WIDGETS;
}

export function loadDashboardLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    const parsed = JSON.parse(raw);
    return normalizeDashboardLayout(parsed);
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export function saveDashboardLayout(layout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export function resetDashboardLayout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Carica layout: server se autenticato, altrimenti localStorage. */
export async function resolveDashboardLayout() {
  if (hasPortfolioSessionSync()) {
    try {
      const remote = await fetchDashboardLayout();
      if (Array.isArray(remote?.layout) && remote.layout.length) {
        const normalized = normalizeDashboardLayout(remote.layout);
        saveDashboardLayout(normalized);
        return normalized;
      }
    } catch {
      /* fallback local */
    }
  }
  return loadDashboardLayout();
}

/** Persistenza con debounce su server + localStorage. */
export function useDashboardPersistence(layout, setLayout) {
  const timer = useRef(null);

  useEffect(() => {
    saveDashboardLayout(layout);
    if (!hasPortfolioSessionSync()) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveDashboardLayoutRemote(layout).catch(() => {});
    }, 800);
    return () => clearTimeout(timer.current);
  }, [layout]);

  const hydrate = useCallback(async () => {
    const resolved = normalizeDashboardLayout(await resolveDashboardLayout());
    setLayout(resolved);
  }, [setLayout]);

  return { hydrate };
}
