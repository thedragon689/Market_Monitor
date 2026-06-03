import { useMemo, useState } from 'react';
import {
  AFRICA_STOCKS,
  COMMODITY_METAL_SYMBOLS,
  CRYPTO_SYMBOLS,
  EU_STOCKS,
  NATIONAL_STOCKS,
  PRECIOUS_METAL_SYMBOLS,
  STOCK_SYMBOLS,
  US_STOCKS,
} from '../data/symbols';
import { changeTone, formatChangeBadge, formatCurrentPrice } from '../utils/catalogPrice';

const STOCK_FILTERS = [
  { id: 'all', label: 'Tutti' },
  { id: 'US', label: 'USA' },
  { id: 'EU', label: 'Europa' },
  { id: 'AF', label: 'Africa' },
];

const STOCK_SECTIONS = [
  { id: 'US', title: 'Stati Uniti', items: US_STOCKS },
  { id: 'EU', title: 'Europa', items: EU_STOCKS },
  { id: 'AF', title: 'Africa', items: AFRICA_STOCKS },
];

function SymbolChip({ item, symbol, quotesBySymbol, fx, onSymbolChange }) {
  const q = quotesBySymbol?.[item.id.toUpperCase()] ?? quotesBySymbol?.[item.id];
  const price = formatCurrentPrice(q, item, fx);
  const chg = formatChangeBadge(q);
  const tone = changeTone(q?.changePercent);

  return (
    <button
      type="button"
      className={`symbol-chip ${symbol === item.id ? 'is-selected' : ''}`}
      onClick={() => onSymbolChange(item.id)}
    >
      <span className="symbol-chip__row">
        <span className="symbol-chip__code">{item.id}</span>
        {chg != null && (
          <span className={`symbol-chip__chg symbol-chip__chg--${tone}`}>{chg}</span>
        )}
      </span>
      <span className="symbol-chip__name">{item.name}</span>
      <span className="symbol-chip__price">
        {q?.price ? price.primary : '—'}
        {price.unit && q?.price ? ` ${price.unit}` : ''}
      </span>
      <span className="symbol-chip__desc">{item.hint}</span>
      {item.region && <span className="symbol-chip__region">{item.region}</span>}
    </button>
  );
}

export default function SymbolPicker({
  type,
  symbol,
  onTypeChange,
  onSymbolChange,
  quotesBySymbol,
  fx,
  showCategoryTabs = false,
}) {
  const [stockFilter, setStockFilter] = useState('all');

  const options = useMemo(() => {
    if (type === 'national') return NATIONAL_STOCKS;
    if (type === 'crypto') return CRYPTO_SYMBOLS;
    if (type === 'precious') return PRECIOUS_METAL_SYMBOLS;
    if (type === 'commodity') return COMMODITY_METAL_SYMBOLS;
    if (stockFilter === 'US') return US_STOCKS;
    if (stockFilter === 'EU') return EU_STOCKS;
    if (stockFilter === 'AF') return AFRICA_STOCKS;
    return STOCK_SYMBOLS;
  }, [type, stockFilter]);

  return (
    <div className="symbol-picker">
      {showCategoryTabs && (
        <div className="symbol-picker__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={type === 'stock'}
            className={`symbol-picker__tab ${type === 'stock' ? 'is-active' : ''}`}
            onClick={() => onTypeChange('stock')}
          >
            Azioni
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={type === 'precious'}
            className={`symbol-picker__tab ${type === 'precious' ? 'is-active' : ''}`}
            onClick={() => onTypeChange('precious')}
          >
            Metalli preziosi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={type === 'commodity'}
            className={`symbol-picker__tab ${type === 'commodity' ? 'is-active' : ''}`}
            onClick={() => onTypeChange('commodity')}
          >
            Materie prime
          </button>
        </div>
      )}

      {type === 'stock' && (
        <div className="symbol-picker__filters" role="group" aria-label="Filtra per mercato">
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`symbol-picker__filter ${stockFilter === f.id ? 'is-active' : ''}`}
              onClick={() => setStockFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <p className="symbol-picker__hint">
        Tocca un asset per aprire subito l&apos;analisi con prezzo e grafico.
      </p>

      {type === 'stock' && stockFilter === 'all' ? (
        <div className="symbol-picker__sections">
          {STOCK_SECTIONS.map((section) => (
            <div key={section.id} className="symbol-picker__section">
              <h4 className="symbol-picker__section-title">{section.title}</h4>
              <div className="symbol-picker__grid">
                {section.items.map((item) => (
                  <SymbolChip
                    key={item.id}
                    item={item}
                    symbol={symbol}
                    fx={fx}
                    quotesBySymbol={quotesBySymbol}
                    onSymbolChange={onSymbolChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="symbol-picker__grid">
          {options.map((item) => (
            <SymbolChip
              key={item.id}
              item={item}
              symbol={symbol}
              fx={fx}
              quotesBySymbol={quotesBySymbol}
              onSymbolChange={onSymbolChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
