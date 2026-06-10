import { useMemo, useState } from 'react';
import { formatPercent } from '../utils/format';
import { changeTone, formatCurrentPrice } from '../utils/catalogPrice';
import {
  AFRICA_STOCKS,
  EU_STOCKS,
  US_STOCKS,
  getSymbolMeta,
  getSymbolsForType,
} from '../data/symbols';
import { SORT_OPTIONS, sortAssetItems } from '../utils/sortAssets';
import { downloadCsv } from '../utils/exportCsv';

function formatTablePrice(quote, meta, fx) {
  const price = formatCurrentPrice(quote, meta, fx);
  if (!quote?.price) return '—';
  if (price.secondary) return `${price.primary} · ${price.secondary}`;
  return price.primary;
}

const STOCK_REGIONS = [
  { id: 'US', title: 'Stati Uniti', items: US_STOCKS },
  { id: 'EU', title: 'Europa', items: EU_STOCKS },
  { id: 'AF', title: 'Africa', items: AFRICA_STOCKS },
];

function CompetitorRow({
  id,
  type,
  selectedSymbol,
  quotesBySymbol,
  loading,
  fx,
  onSelect,
  onForecast,
  forecastLoading,
}) {
  const meta = getSymbolMeta(id, type);
  const quote = quotesBySymbol?.[id.toUpperCase()] ?? quotesBySymbol?.[id];
  const selected = id === selectedSymbol;
  const pct = quote?.changePercent != null ? Number(quote.changePercent) : null;
  const tone = changeTone(pct);
  const isEquity = type === 'stock' || type === 'national';

  return (
    <tr
      className={`competitor-table__row ${selected ? 'is-selected' : ''} ${loading ? 'is-loading' : ''}`}
      onClick={() => onSelect?.(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Apri analisi di ${meta.name || id}`}
    >
      <td>
        <span className="competitor-table__code">{id}</span>
        <span className="competitor-table__name">{meta.name}</span>
      </td>
      {isEquity && <td className="competitor-table__market">{meta.region || '—'}</td>}
      <td className="competitor-table__sector">{meta.family || meta.sector || '—'}</td>
      <td className="competitor-table__price">
        {loading && !quote ? '…' : formatTablePrice(quote, meta, fx)}
      </td>
      <td className={`competitor-table__chg competitor-table__chg--${tone}`}>
        {pct == null ? '—' : formatPercent(pct)}
      </td>
      <td className="competitor-table__action">
        <button
          type="button"
          className="btn btn--cta btn--compact"
          disabled={forecastLoading}
          onClick={(e) => {
            e.stopPropagation();
            onForecast?.(id);
          }}
        >
          {forecastLoading && selected ? '…' : 'Prevedi'}
        </button>
      </td>
    </tr>
  );
}

function CompetitorTableBody({
  ids,
  type,
  selectedSymbol,
  quotesBySymbol,
  loading,
  fx,
  onSelect,
  onForecast,
  forecastLoading,
}) {
  return ids.map((id) => (
    <CompetitorRow
      key={id}
      id={id}
      type={type}
      selectedSymbol={selectedSymbol}
      quotesBySymbol={quotesBySymbol}
      loading={loading}
      fx={fx}
      onSelect={onSelect}
      onForecast={onForecast}
      forecastLoading={forecastLoading}
    />
  ));
}

export default function CompetitorBoard({
  type,
  selectedSymbol,
  quotesBySymbol,
  loading,
  fx,
  onSelect,
  onForecast,
  forecastLoading,
}) {
  const [sortBy, setSortBy] = useState('name');
  const isEquity = type === 'stock' || type === 'national';
  const isPrecious = type === 'precious';
  const isCrypto = type === 'crypto';

  const title = type === 'national'
    ? 'Confronto azioni nazionali'
    : type === 'stock'
      ? 'Confronto per categoria'
      : isCrypto
        ? 'Confronto criptovalute'
        : isPrecious
          ? 'Confronto metalli preziosi'
          : 'Confronto materie prime';

  const lead = type === 'national'
    ? 'Titoli FTSE MIB quotati in euro. Ordina e avvia la previsione su ogni titolo.'
    : type === 'stock'
      ? 'Azioni raggruppate per mercato geografico. Ordina e avvia la previsione su ogni titolo.'
      : isCrypto
        ? 'Bitcoin, Ethereum e altcoin — prezzo per coin in € e $.'
        : isPrecious
          ? 'Confronta oro, argento, platino e palladio al grammo (€ e $).'
          : 'Petrolio al barile, rame al grammo — ordina e calcola la previsione.';

  const stockGroups = useMemo(() => {
    if (type !== 'stock') return null;
    return STOCK_REGIONS.map((region) => {
      const items = sortAssetItems(
        region.items.map((item) => {
          const quote = quotesBySymbol?.[item.id.toUpperCase()] ?? quotesBySymbol?.[item.id];
          return { ...item, quote };
        }),
        sortBy
      );
      return { ...region, ids: items.map((i) => i.id) };
    });
  }, [type, quotesBySymbol, sortBy]);

  const flatIds = useMemo(() => {
    const list = getSymbolsForType(type).map((item) => {
      const quote = quotesBySymbol?.[item.id.toUpperCase()] ?? quotesBySymbol?.[item.id];
      return { ...item, quote };
    });
    return sortAssetItems(list, sortBy).map((i) => i.id);
  }, [type, quotesBySymbol, sortBy]);

  const exportCsv = () => {
    const ids = flatIds;
    const headers = ['Simbolo', 'Nome', 'Prezzo', 'Var %'];
    const rows = ids.map((id) => {
      const meta = getSymbolMeta(id, type);
      const q = quotesBySymbol?.[id.toUpperCase()] ?? quotesBySymbol?.[id];
      return [
        id,
        meta.name,
        q?.price ?? '',
        q?.changePercent ?? '',
      ];
    });
    downloadCsv(`confronto-${type}.csv`, headers, rows);
  };

  const tableHead = (
    <thead>
      <tr>
        <th>{isEquity ? 'Titolo' : 'Simbolo'}</th>
        {isEquity && <th>Mercato</th>}
        <th>{isEquity ? 'Settore' : 'Famiglia'}</th>
        <th>Prezzo</th>
        <th>Var. %</th>
        <th>Previsione</th>
      </tr>
    </thead>
  );

  return (
    <section className="competitor-board">
      <div className="competitor-board__header">
        <div className="competitor-board__heading">
          <h2 className="app-section__title">{title}</h2>
          <p className="competitor-board__lead">{lead}</p>
        </div>
        <div className="competitor-board__toolbar">
          <label className="competitor-board__sort">
            <span>Ordina</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={exportCsv}
          >
            Esporta CSV
          </button>
        </div>
      </div>

      {type === 'stock' ? (
        <div className="competitor-board__groups">
          {stockGroups.map((group) => (
            <div key={group.id} className="competitor-board__group">
              <h3 className="competitor-board__group-title">
                <span>{group.title}</span>
                <span className="competitor-board__group-count">{group.ids.length}</span>
              </h3>
              <div className="competitor-board__wrap">
                <table className="competitor-table">
                  {tableHead}
                  <tbody>
                    <CompetitorTableBody
                      ids={group.ids}
                      type={type}
                      selectedSymbol={selectedSymbol}
                      quotesBySymbol={quotesBySymbol}
                      loading={loading}
                      fx={fx}
                      onSelect={onSelect}
                      onForecast={onForecast}
                      forecastLoading={forecastLoading}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="competitor-board__wrap">
          <table className="competitor-table">
            {tableHead}
            <tbody>
              <CompetitorTableBody
                ids={flatIds}
                type={type}
                selectedSymbol={selectedSymbol}
                quotesBySymbol={quotesBySymbol}
                loading={loading}
                fx={fx}
                onSelect={onSelect}
                onForecast={onForecast}
                forecastLoading={forecastLoading}
              />
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
