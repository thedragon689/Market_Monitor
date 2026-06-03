const GROUP_LABELS = {
  asset: 'Confronto asset selezionato',
  macro: 'Benchmark di mercato',
};

function CorrelationTable({ title, rows }) {
  if (!rows?.length) return null;

  return (
    <div className="market-corr__block">
      <h4 className="market-corr__block-title">{title}</h4>
      <div className="market-corr__table-wrap">
        <table className="market-corr__table">
          <thead>
            <tr>
              <th>Confronto</th>
              <th>Parametro</th>
              <th>ρ</th>
              <th>Forza</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`market-corr__row market-corr__row--${row.tone}`}>
                <td>
                  <span className="market-corr__label">{row.label}</span>
                  {(row.symbolA || row.symbolB) && (
                    <span className="market-corr__symbols">
                      {row.symbolA} · {row.symbolB}
                    </span>
                  )}
                </td>
                <td className="market-corr__role">{row.role || '—'}</td>
                <td className="market-corr__value">
                  {row.correlation != null ? row.correlation.toFixed(3) : '—'}
                </td>
                <td>
                  <span className={`market-corr__badge market-corr__badge--${row.tone}`}>
                    {row.interpretation || 'N/D'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CorrelationCards({ cells }) {
  if (!cells?.length) return null;
  return (
    <div className="market-corr__cards">
      {cells.map((c) => (
        <div
          key={c.id}
          className={`market-corr__card market-corr__card--${c.tone}`}
          style={{ opacity: 0.55 + (c.intensity || 0) * 0.45 }}
        >
          <span className="market-corr__card-label">{c.label}</span>
          <strong className="market-corr__card-value">
            {c.value != null ? c.value.toFixed(2) : '—'}
          </strong>
          <span className="market-corr__card-hint">{c.interpretation || c.role}</span>
        </div>
      ))}
    </div>
  );
}

export default function MarketCorrelations({ intelligence, correlations, loading }) {
  const meta = intelligence?.correlationMeta;
  const pairs = correlations?.pairs ?? intelligence?.correlations ?? [];
  const assetRows = meta?.asset ?? pairs.filter((p) => p.group === 'asset');
  const macroRows = meta?.macro ?? pairs.filter((p) => p.group === 'macro');
  const heatmap = correlations?.heatmap ?? intelligence?.heatmap ?? [];

  if (loading && !pairs.length) {
    return (
      <section className="market-corr market-corr--loading">
        <p>Calcolo correlazioni e benchmark di confronto…</p>
      </section>
    );
  }

  if (!pairs.length && !heatmap.length) {
    return (
      <section className="market-corr market-corr--empty">
        <p>Correlazioni non disponibili al momento.</p>
      </section>
    );
  }

  return (
    <section className="market-corr">
      <div className="market-corr__intro">
        <p>
          Correlazione di Pearson su storico recente (min. 8 punti). I benchmark macro e quelli
          sull&apos;asset selezionato forniscono parametri di confronto tra mercati.
        </p>
        {meta?.updatedAt && (
          <time className="market-corr__updated">
            Aggiornato · {new Date(meta.updatedAt).toLocaleString('it-IT')}
          </time>
        )}
      </div>

      <CorrelationTable title={GROUP_LABELS.asset} rows={assetRows} />
      <CorrelationTable title={GROUP_LABELS.macro} rows={macroRows} />
      <CorrelationCards cells={heatmap} />
    </section>
  );
}
