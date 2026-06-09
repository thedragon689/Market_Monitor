/** Barra azioni fissa in basso su mobile (analisi / previsione). */
export default function MobileStickyActions({
  onAdvice,
  onForecast,
  loadingAdvice,
  loadingForecast,
  loadingMarket,
  quoteReady,
}) {
  return (
    <div className="mobile-sticky-actions" role="group" aria-label="Azioni rapide">
      <button
        type="button"
        className="mobile-sticky-actions__btn mobile-sticky-actions__btn--primary"
        onClick={onAdvice}
        disabled={loadingAdvice || loadingMarket || !quoteReady}
      >
        {loadingAdvice ? '…' : 'Consiglio'}
      </button>
      <button
        type="button"
        className="mobile-sticky-actions__btn mobile-sticky-actions__btn--cta"
        onClick={onForecast}
        disabled={loadingForecast || loadingMarket || !quoteReady}
      >
        {loadingForecast ? '…' : 'Prevedi'}
      </button>
    </div>
  );
}
