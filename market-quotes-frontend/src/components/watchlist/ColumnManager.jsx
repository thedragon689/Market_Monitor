import { useState } from 'react';
import { COLUMNS } from './columns.jsx';

/** Menu per mostrare/nascondere le colonne della watchlist. */
export default function ColumnManager({ visible, onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (id) => {
    if (visible.includes(id)) {
      onChange(visible.filter((v) => v !== id));
    } else {
      onChange([...visible, id]);
    }
  };

  return (
    <div className="wl-colmgr">
      <button
        type="button"
        className="ui-btn ui-btn--outline ui-btn--sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        ⚙ Colonne
      </button>
      {open && (
        <div className="wl-colmgr__menu" role="menu">
          {COLUMNS.map((col) => (
            <label key={col.id} className="wl-colmgr__item">
              <input
                type="checkbox"
                checked={visible.includes(col.id)}
                disabled={col.fixed}
                onChange={() => toggle(col.id)}
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
