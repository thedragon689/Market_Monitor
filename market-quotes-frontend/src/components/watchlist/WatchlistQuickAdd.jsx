import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { ALL_SYMBOLS, TYPE_LABELS } from '../../data/allSymbols';

/** Ricerca fuzzy (fuse.js) per aggiungere rapidamente asset alla watchlist. */
export default function WatchlistQuickAdd({ onAdd, has }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  const fuse = useMemo(
    () =>
      new Fuse(ALL_SYMBOLS, {
        keys: ['symbol', 'name', 'hint'],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    []
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query.trim(), { limit: 8 }).map((r) => r.item);
  }, [fuse, query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const choose = (item) => {
    if (!item) return;
    onAdd?.(item.symbol, item.type);
    setQuery('');
    setOpen(false);
    setActive(0);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="wl-quickadd" ref={boxRef}>
      <span className="wl-quickadd__icon" aria-hidden="true">
        +
      </span>
      <input
        type="search"
        className="wl-quickadd__input"
        placeholder="Aggiungi asset (es. Apple, BTC, Eni)…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Cerca e aggiungi asset"
        aria-expanded={open}
        role="combobox"
        aria-controls="wl-quickadd-list"
      />
      {open && results.length > 0 && (
        <ul className="wl-quickadd__list" id="wl-quickadd-list" role="listbox">
          {results.map((item, i) => {
            const already = has?.(item.symbol, item.type);
            return (
              <li key={`${item.type}:${item.symbol}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={`wl-quickadd__opt ${i === active ? 'is-active' : ''}`}
                  disabled={already}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(item)}
                >
                  <span className="wl-quickadd__sym">{item.symbol}</span>
                  <span className="wl-quickadd__name">{item.name}</span>
                  <span className="wl-quickadd__type">{TYPE_LABELS[item.type] || item.type}</span>
                  {already ? <span className="wl-quickadd__added">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
