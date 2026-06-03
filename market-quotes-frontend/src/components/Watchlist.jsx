import { useCallback, useEffect, useState } from 'react';

const KEY = 'market-monitor-watchlist-v1';
const MAX = 12;

function loadList() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function saveList(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

export default function Watchlist({
  symbol,
  type,
  onSelect,
  quotesBySymbol,
  fx,
}) {
  const [items, setItems] = useState(loadList);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setItems(loadList());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addCurrent = useCallback(() => {
    const entry = { id: symbol, type, addedAt: Date.now() };
    setItems((prev) => {
      const filtered = prev.filter(
        (x) => !(x.id === entry.id && x.type === entry.type)
      );
      const next = [entry, ...filtered].slice(0, MAX);
      saveList(next);
      return next;
    });
  }, [symbol, type]);

  const remove = useCallback((id, assetType) => {
    setItems((prev) => {
      const next = prev.filter((x) => !(x.id === id && x.type === assetType));
      saveList(next);
      return next;
    });
  }, []);

  const hasCurrent = items.some((x) => x.id === symbol && x.type === type);

  if (!items.length) {
    return (
      <section className="watchlist app-card">
        <header className="watchlist__head">
          <h3 className="watchlist__title">Preferiti</h3>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={addCurrent}
            disabled={hasCurrent}
          >
            + Aggiungi {symbol}
          </button>
        </header>
        <p className="watchlist__empty">
          Nessun preferito. Salva asset che segui spesso.
        </p>
      </section>
    );
  }

  return (
    <section className="watchlist app-card">
      <header className="watchlist__head">
        <h3 className="watchlist__title">Preferiti</h3>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={addCurrent}
          disabled={hasCurrent}
        >
          + {symbol}
        </button>
      </header>
      <ul className="watchlist__list">
        {items.map((item) => {
          const q =
            quotesBySymbol?.[item.id.toUpperCase()] ??
            quotesBySymbol?.[item.id];
          return (
            <li key={`${item.type}-${item.id}`} className="watchlist__item">
              <button
                type="button"
                className="watchlist__pick"
                onClick={() => onSelect(item.id, item.type)}
              >
                <span className="watchlist__code">{item.id}</span>
                <span className="watchlist__price">
                  {q?.price != null ? Number(q.price).toFixed(2) : '—'}
                </span>
              </button>
              <button
                type="button"
                className="watchlist__remove"
                aria-label={`Rimuovi ${item.id}`}
                onClick={() => remove(item.id, item.type)}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
