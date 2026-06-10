export default function ViewFooter({
  view,
  onViewChange,
  onForecast,
  loadingForecast,
  loadingMarket,
  hasForecast,
}) {
  if (view === 'explore') {
    return (
      <div className="view-footer view-footer--explore">
        <p className="view-footer__hint">
          Hai scelto un asset? Passa all&apos;analisi per vedere prezzo e grafico.
        </p>
        <button type="button" className="btn btn--primary" onClick={() => onViewChange('analysis')}>
          Vai all&apos;analisi →
        </button>
      </div>
    );
  }

  if (view === 'analysis') {
    return (
      <div className="view-footer view-footer--split view-footer--analysis">
        <button
          type="button"
          className="btn btn--ghost view-footer__back"
          onClick={() => onViewChange('explore')}
        >
          ← Cambia asset
        </button>
        <button type="button" className="btn btn--cta" onClick={() => onViewChange('advice')}>
          Vedi consigli →
        </button>
      </div>
    );
  }

  if (view === 'advice') {
    return (
      <div className="view-footer view-footer--advice">
        <button
          type="button"
          className="btn btn--ghost view-footer__back"
          onClick={() => onViewChange('analysis')}
        >
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
    );
  }

  return (
    <div className="view-footer view-footer--split view-footer--forecast">
      <button
        type="button"
        className="btn btn--ghost view-footer__back"
        onClick={() => onViewChange('analysis')}
      >
        ← Torna all&apos;analisi
      </button>
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
