import { useMemo } from 'react';
import { List } from 'react-window';
import { COLUMNS } from './columns.jsx';

const ROW_HEIGHT = 44;
const ACTIONS_WIDTH = 96;

function gridTemplate(visibleCols) {
  return `${visibleCols.map((c) => `${c.width}px`).join(' ')} ${ACTIONS_WIDTH}px`;
}

/** Applica ordinamento multi-colonna: sortKeys = [{ id, dir }]. */
function sortRows(rows, sortKeys) {
  if (!sortKeys.length) return rows;
  const colById = Object.fromEntries(COLUMNS.map((c) => [c.id, c]));
  return [...rows].sort((a, b) => {
    for (const { id, dir } of sortKeys) {
      const col = colById[id];
      if (!col) continue;
      const va = col.sortValue(a);
      const vb = col.sortValue(b);
      let cmp = 0;
      if (typeof va === 'string' || typeof vb === 'string') {
        cmp = String(va).localeCompare(String(vb));
      } else {
        cmp = (va ?? 0) - (vb ?? 0);
      }
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

function Row({ index, style, rows, visibleCols, onSelect, onRemove, onToggleAlert }) {
  const row = rows[index];
  return (
    <div
      className="wl-row"
      style={{ ...style, gridTemplateColumns: gridTemplate(visibleCols) }}
      role="row"
    >
      {visibleCols.map((col) => (
        <button
          key={col.id}
          type="button"
          className={`wl-cell wl-cell--${col.align} ${col.id === 'symbol' ? 'wl-cell--link' : ''}`}
          onClick={() => (col.id === 'symbol' ? onSelect?.(row) : undefined)}
          tabIndex={col.id === 'symbol' ? 0 : -1}
        >
          {col.render(row)}
        </button>
      ))}
      <div className="wl-cell wl-cell--actions" role="cell">
        <button
          type="button"
          className={`wl-icon-btn ${row.alert ? 'is-on' : ''}`}
          title={row.alert ? 'Alert attivo' : 'Attiva alert'}
          aria-pressed={Boolean(row.alert)}
          onClick={() => onToggleAlert?.(row)}
        >
          {row.alert ? '🔔' : '🔕'}
        </button>
        <button
          type="button"
          className="wl-icon-btn wl-icon-btn--danger"
          title="Rimuovi"
          onClick={() => onRemove?.(row)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function WatchlistTable({
  rows,
  visible,
  sortKeys,
  onSort,
  onSelect,
  onRemove,
  onToggleAlert,
  height = 420,
}) {
  const visibleCols = useMemo(
    () => COLUMNS.filter((c) => visible.includes(c.id)),
    [visible]
  );

  const sorted = useMemo(() => sortRows(rows, sortKeys), [rows, sortKeys]);

  const dirOf = (id) => sortKeys.find((k) => k.id === id)?.dir;
  const orderOf = (id) => {
    const idx = sortKeys.findIndex((k) => k.id === id);
    return idx === -1 || sortKeys.length < 2 ? '' : ` ${idx + 1}`;
  };

  return (
    <div className="wl-table" role="table">
      <div
        className="wl-head"
        role="row"
        style={{ gridTemplateColumns: gridTemplate(visibleCols) }}
      >
        {visibleCols.map((col) => {
          const dir = dirOf(col.id);
          return (
            <button
              key={col.id}
              type="button"
              className={`wl-th wl-cell--${col.align} ${dir ? 'is-sorted' : ''}`}
              onClick={(e) => onSort?.(col.id, e.shiftKey)}
              title="Click per ordinare · Shift+click per ordinamento multiplo"
            >
              {col.label}
              {dir ? (
                <span className="wl-sort-ind">
                  {dir === 'asc' ? '▲' : '▼'}
                  {orderOf(col.id)}
                </span>
              ) : null}
            </button>
          );
        })}
        <div className="wl-th wl-cell--center">Azioni</div>
      </div>

      {sorted.length === 0 ? (
        <div className="wl-empty">Nessun asset in watchlist. Aggiungine uno con la ricerca.</div>
      ) : (
        <List
          rowCount={sorted.length}
          rowHeight={ROW_HEIGHT}
          style={{ height, width: '100%' }}
          rowComponent={Row}
          rowProps={{
            rows: sorted,
            visibleCols,
            onSelect,
            onRemove,
            onToggleAlert,
          }}
        />
      )}
    </div>
  );
}
