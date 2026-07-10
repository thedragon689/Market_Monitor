import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../config/api';
import { apiFetch } from '../utils/apiFetch';

const STORAGE_KEY = 'mm:watchlist';
const REFRESH_MS = 60 * 1000;

const DEFAULT_ITEMS = [
  { symbol: 'AAPL', type: 'stock' },
  { symbol: 'BTC-USD', type: 'crypto' },
  { symbol: 'ENI.MI', type: 'national' },
];

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ITEMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_ITEMS;
  } catch {
    return DEFAULT_ITEMS;
  }
}

function persist(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

const keyOf = (symbol, type) => `${type}:${String(symbol).toUpperCase()}`;

/**
 * Gestione watchlist: CRUD persistito in localStorage + fetch quotazioni e
 * storico (per sparkline) via /api/market/batch, con refresh periodico.
 */
export function useWatchlist() {
  const [items, setItems] = useState(loadItems);
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => persist(items), [items]);

  const fetchData = useCallback(async (list) => {
    if (!list.length) {
      setRows({});
      return;
    }
    setLoading(true);
    try {
      const param = list.map((it) => `${it.type}:${it.symbol}`).join(',');
      const { data } = await apiFetch(
        `${API_BASE}/api/market/batch?items=${encodeURIComponent(param)}&limit=30`,
        { optional: true }
      );
      if (!data?.results) return;
      const map = {};
      for (const r of data.results) {
        if (!r?.symbol) continue;
        map[keyOf(r.symbol, r.type)] = {
          symbol: r.symbol,
          type: r.type,
          name: r.name,
          quote: r.quote,
          history: r.history ?? [],
        };
      }
      setRows(map);
    } catch {
      /* la watchlist resta con i dati precedenti */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(items);
    clearInterval(timer.current);
    timer.current = setInterval(() => fetchData(items), REFRESH_MS);
    return () => clearInterval(timer.current);
  }, [items, fetchData]);

  const add = useCallback((symbol, type) => {
    setItems((prev) => {
      if (prev.some((it) => keyOf(it.symbol, it.type) === keyOf(symbol, type))) {
        return prev;
      }
      return [...prev, { symbol: String(symbol).toUpperCase(), type }];
    });
  }, []);

  const remove = useCallback((symbol, type) => {
    setItems((prev) =>
      prev.filter((it) => keyOf(it.symbol, it.type) !== keyOf(symbol, type))
    );
  }, []);

  const toggleAlert = useCallback((symbol, type) => {
    setItems((prev) =>
      prev.map((it) =>
        keyOf(it.symbol, it.type) === keyOf(symbol, type)
          ? { ...it, alert: !it.alert }
          : it
      )
    );
  }, []);

  const has = useCallback(
    (symbol, type) =>
      items.some((it) => keyOf(it.symbol, it.type) === keyOf(symbol, type)),
    [items]
  );

  const merged = useMemo(
    () =>
      items.map((it) => {
        const data = rows[keyOf(it.symbol, it.type)] || {};
        return { ...it, ...data, symbol: it.symbol, type: it.type };
      }),
    [items, rows]
  );

  return {
    items,
    rows: merged,
    loading,
    add,
    remove,
    toggleAlert,
    has,
    refresh: () => fetchData(items),
  };
}
