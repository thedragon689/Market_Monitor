import ForecastCards from './ForecastCards';

/** Anteprima compatta previsioni ARIMA / LSTM / Ibrido nella pagina analisi. */
export default function ForecastPreview({
  forecast,
  loading,
  loadingForecast,
  fx,
  type,
  symbol,
  quote,
  onCalculate,
}) {
  if (loading && !forecast) {
    return (
      <section className="forecast-preview app-card">
        <div className="skeleton skeleton--block" />
      </section>
    );
  }

  if (!forecast) {
    return (
      <section className="forecast-preview app-card forecast-preview--empty">
        <h3 className="view-panel__subtitle">Previsioni</h3>
        <p className="forecast-preview__lead">
          Calcola scenari ARIMA, LSTM e modello ibrido per visualizzarli qui e sul grafico.
        </p>
        <button
          type="button"
          className="btn btn--cta"
          onClick={onCalculate}
          disabled={loadingForecast}
        >
          {loadingForecast ? 'Calcolo in corso…' : 'Calcola previsioni'}
        </button>
      </section>
    );
  }

  return (
    <section className="forecast-preview app-card">
      <header className="forecast-preview__head">
        <h3 className="view-panel__subtitle">Previsioni</h3>
        <button
          type="button"
          className="btn btn--ghost btn--compact"
          onClick={onCalculate}
          disabled={loadingForecast}
        >
          {loadingForecast ? '…' : 'Ricalcola'}
        </button>
      </header>
      <ForecastCards
        forecast={forecast}
        loading={loading}
        fx={fx}
        type={type}
        symbol={symbol}
        quote={quote}
      />
    </section>
  );
}
