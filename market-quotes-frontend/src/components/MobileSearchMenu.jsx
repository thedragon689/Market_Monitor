import { useEffect, useMemo, useRef, useState } from 'react';
import BottomNavIcon from './BottomNavIcon';
import { SearchIcon } from './icons/HeaderIcons';
import { changeTone, formatChangeBadge, formatCurrentPrice } from '../utils/catalogPrice';
import { flattenCatalogAssets, searchCatalogAssets } from '../utils/assetSearch';

const QUICK_ACTIONS = [
  { id: 'info', label: 'Info & fonti dati', hint: 'Disclaimer e provider', icon: 'info' },
  { id: 'favorites', label: 'Preferiti', hint: 'Watchlist salvata', icon: 'favorites' },
];

function ResultRow({ item, fx, onPick }) {
  const quote = item.quote;
  const price = formatCurrentPrice(quote, item, fx);
  const chg = formatChangeBadge(quote);
  const tone = changeTone(quote?.changePercent);

  return (
    <button
      type="button"
      className="mobile-search-menu__result"
      onClick={() => onPick(item.id, item.assetType)}
    >
      <span className="mobile-search-menu__result-avatar" aria-hidden>
        {item.name.charAt(0).toUpperCase()}
      </span>
      <span className="mobile-search-menu__result-main">
        <span className="mobile-search-menu__result-name">{item.name}</span>
        <span className="mobile-search-menu__result-meta">
          <code>{item.id}</code>
          <span>{item.categoryLabel}</span>
        </span>
      </span>
      <span className="mobile-search-menu__result-quote">
        <span className="mobile-search-menu__result-price">{price.primary}</span>
        {chg != null && (
          <span className={`mobile-search-menu__result-chg mobile-search-menu__result-chg--${tone}`}>
            {chg}
          </span>
        )}
      </span>
    </button>
  );
}

export default function MobileSearchMenu({
  open,
  onClose,
  onSelect,
  onSelectAsset,
  catalog,
  fx,
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const assets = useMemo(() => flattenCatalogAssets(catalog), [catalog]);

  const results = useMemo(
    () => searchCatalogAssets(assets, query, { limit: 14 }),
    [assets, query]
  );

  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handlePick = (id, assetType) => {
    onSelectAsset?.(id, assetType);
    onClose?.();
  };

  return (
    <div className="mobile-search-menu" role="presentation">
      <button
        type="button"
        className="mobile-search-menu__backdrop"
        aria-label="Chiudi"
        onClick={onClose}
      />
      <div
        className="mobile-search-menu__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-search-menu-title"
      >
        <header className="mobile-search-menu__head">
          <h2 id="mobile-search-menu-title" className="mobile-search-menu__title">
            Cerca asset
          </h2>
          <button
            type="button"
            className="mobile-search-menu__close"
            onClick={onClose}
            aria-label="Chiudi"
          >
            ✕
          </button>
        </header>

        <div className="mobile-search-menu__field-wrap">
          <span className="mobile-search-menu__field-icon" aria-hidden>
            <SearchIcon size={18} />
          </span>
          <input
            ref={inputRef}
            type="search"
            className="mobile-search-menu__field"
            placeholder="Nome o simbolo (es. BTC, Eni, S&P)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cerca asset per nome o simbolo"
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button
              type="button"
              className="mobile-search-menu__field-clear"
              onClick={() => setQuery('')}
              aria-label="Cancella ricerca"
            >
              ×
            </button>
          )}
        </div>

        {hasQuery ? (
          <div className="mobile-search-menu__results" role="listbox" aria-label="Risultati ricerca">
            {results.length === 0 ? (
              <p className="mobile-search-menu__empty">
                Nessun risultato per «{query.trim()}». Prova un altro nome o simbolo.
              </p>
            ) : (
              results.map((item) => (
                <ResultRow
                  key={`${item.assetType}-${item.id}`}
                  item={item}
                  fx={fx}
                  onPick={handlePick}
                />
              ))
            )}
          </div>
        ) : (
          <>
            <p className="mobile-search-menu__hint">
              Digita almeno una lettera per vedere i suggerimenti.
            </p>
            <ul className="mobile-search-menu__list">
              {QUICK_ACTIONS.map((action) => (
                <li key={action.id}>
                  <button
                    type="button"
                    className="mobile-search-menu__option"
                    onClick={() => {
                      onSelect?.(action.id);
                      onClose?.();
                    }}
                  >
                    <span className="mobile-search-menu__option-icon" aria-hidden>
                      <BottomNavIcon id={action.icon} active />
                    </span>
                    <span className="mobile-search-menu__option-text">
                      <strong>{action.label}</strong>
                      <small>{action.hint}</small>
                    </span>
                    <span className="mobile-search-menu__option-arrow" aria-hidden>
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
