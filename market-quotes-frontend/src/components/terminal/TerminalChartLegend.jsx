export default function TerminalChartLegend({ picks = [], onRemove }) {
  if (!picks.length) {
    return (
      <p className="terminal-legend terminal-legend--empty">
        Seleziona fino a 6 asset con la checkbox nelle tabelle.
      </p>
    );
  }

  return (
    <div className="terminal-legend" role="list" aria-label="Asset nel grafico">
      {picks.map((pick, i) => (
        <span
          key={pick.id}
          className="terminal-legend__chip"
          role="listitem"
          style={{ '--chip-color': pick.color }}
        >
          <span className="terminal-legend__dot" aria-hidden />
          <span className="terminal-legend__name">{pick.name}</span>
          <code className="terminal-legend__code">{pick.id}</code>
          {onRemove && (
            <button
              type="button"
              className="terminal-legend__remove"
              aria-label={`Rimuovi ${pick.name} dal grafico`}
              onClick={() => onRemove(pick.id)}
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
