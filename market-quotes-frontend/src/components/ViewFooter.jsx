export default function ViewFooter({
  view,
  onViewChange,
  onForecast,
  loadingForecast,
  loadingMarket,
  assetName,
  hasForecast,
}) {
  if (view === 'explore') {
    return (
      <div className="view-footer">
        <p>Hai scelto un asset? Passa all&apos;analisi per vedere prezzo e grafico.</p>
        <button type="button" className="btn btn--primary" onClick={() => onViewChange('analysis')}>
          Vai all&apos;analisi →
        </button>
      </div>
    );
  }

  if (view === 'analysis') {
    return (
      <div className="view-footer view-footer--split">
        <button type="button" className="btn btn--ghost" onClick={() => onViewChange('explore')}>
          ← Cambia asset
        </button>
        <button
          type="button"
          className="btn btn--cta"
          onClick={() => onViewChange('advice')}
        >
          Vedi consigli →
        </button>
      </div>
    );
  }

  if (view === 'advice') {
    return (
      <div className="view-footer view-footer--cta">
        <div>
          <strong>Approfondisci lo scenario</strong>
          <p>Calcola la previsione dettagliata per {assetName}.</p>
        </div>
        <div className="view-footer__nav">
          <button type="button" className="btn btn--ghost" onClick={() => onViewChange('analysis')}>
            ← Analisi
          </button>
          <button
            type="button"
            className="btn btn--cta"
            onClick={onForecast}
            disabled={loadingForecast || loadingMarket}
          >
            {loadingForecast ? 'Calcolo…' : 'Calcola previsione'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-footer view-footer--split">
      <div className="view-footer__nav">
        <button type="button" className="btn btn--ghost" onClick={() => onViewChange('analysis')}>
          ← Torna all&apos;analisi
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => onViewChange('explore')}>
          Cambia asset
        </button>
      </div>
      <button
        type="button"
        className="btn btn--cta"
        onClick={onForecast}
        disabled={loadingForecast || loadingMarket}
      >
        {loadingForecast
          ? 'Calcolo…'
          : hasForecast
            ? 'Ricalcola previsione'
            : 'Calcola previsione'}
      </button>
    </div>
  );
}
