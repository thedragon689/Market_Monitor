import { useEffect, useState } from 'react';
import {
  LEGEND_SECTIONS,
  defaultOpenSection,
  sectionsForView,
} from '../data/legendContent';

function LegendItem({ item }) {
  return (
    <div className="help-legend__item">
      <p className="help-legend__term">{item.term}</p>
      {item.formula && (
        <code className="help-legend__formula">{item.formula}</code>
      )}
      <p className="help-legend__desc">{item.description}</p>
    </div>
  );
}

export default function HelpLegend({ view = 'explore', compact = false, forceOpen = false }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const [expanded, setExpanded] = useState(() => defaultOpenSection(view));

  useEffect(() => {
    setExpanded(defaultOpenSection(view));
  }, [view]);

  const sections = compact ? sectionsForView(view) : LEGEND_SECTIONS;

  return (
    <aside className={`help-legend ${compact ? 'help-legend--compact' : ''}`}>
      <button
        type="button"
        className="help-legend__toggle"
        aria-expanded={isOpen}
        onClick={() => !forceOpen && setOpen((v) => !v)}
        disabled={forceOpen}
      >
        <span className="help-legend__toggle-icon" aria-hidden>
          ?
        </span>
        <span>
          <strong>Legenda e guida</strong>
          <small>Voci, metodi di calcolo, previsioni e analisi</small>
        </span>
        <span className="help-legend__chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="help-legend__body">
          {compact && (
            <p className="help-legend__context">
              Sezione suggerita per il passo corrente. Apri tutte le voci qui sotto o usa il
              pulsante «Mostra tutto» in fondo.
            </p>
          )}

          <div className="help-legend__sections">
            {sections.map((section) => {
              const isExpanded = expanded === section.id;
              return (
                <div
                  key={section.id}
                  className={`help-legend__section ${isExpanded ? 'is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="help-legend__section-head"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpanded(isExpanded ? null : section.id)
                    }
                  >
                    {section.title}
                    <span className="help-legend__section-count">
                      {section.items.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="help-legend__list">
                      {section.items.map((item) => (
                        <LegendItem key={item.term} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {compact && (
            <details className="help-legend__all">
              <summary>Mostra tutte le sezioni della legenda</summary>
              <div className="help-legend__sections help-legend__sections--nested">
                {LEGEND_SECTIONS.filter(
                  (s) => !sections.some((x) => x.id === s.id)
                ).map((section) => (
                  <div key={section.id} className="help-legend__section is-open">
                    <h4 className="help-legend__section-title">{section.title}</h4>
                    <div className="help-legend__list">
                      {section.items.map((item) => (
                        <LegendItem key={item.term} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          <p className="help-legend__disclaimer">
            Le previsioni sono stime statistiche su dati storici, non consigli di investimento.
            I risultati dipendono dalla qualità e lunghezza della serie disponibile.
          </p>
        </div>
      )}
    </aside>
  );
}
