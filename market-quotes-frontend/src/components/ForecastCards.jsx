import { getSymbolMeta } from '../data/symbols';
import { inferNativeCurrency } from '../utils/nativeCurrency';
import { formatRegressionCoeff } from '../utils/pricing';
import ForecastPrice from './ForecastPrice';

function ForecastTable({ forecasts, fx, meta, currency }) {
  if (!forecasts?.length) return <p className="forecast-card__empty">Nessuna stima disponibile.</p>;
  return (
    <ul className="forecast-list">
      {forecasts.map((row) => (
        <li key={row.dayOffset}>
          <span>Giorno +{row.dayOffset}</span>
          <ForecastPrice usd={row.price} fx={fx} meta={meta} currency={currency} as="div" />
        </li>
      ))}
    </ul>
  );
}

function MethodCard({ method, accentClass, fx, meta, currency }) {
  if (!method) return null;
  if (method.error) {
    return (
      <div className="forecast-card forecast-card--error">
        <p>{method.error}</p>
      </div>
    );
  }

  return (
    <div className={`forecast-card ${accentClass}`}>
      <h4>{method.label}</h4>
      <p className="forecast-card__formula">{method.formula}</p>
      <p className="forecast-card__desc">{method.description}</p>

      {fx?.eurUsd && (
        <p className="forecast-card__fx-note">
          Stime in <strong>euro</strong>, con riferimento USD tra parentesi (cambio da quotazione).
        </p>
      )}

      {method.level != null && (
        <p className="forecast-card__level">
          Livello media (N={method.window}):{' '}
          <ForecastPrice usd={method.level} fx={fx} meta={meta} currency={currency} />
        </p>
      )}

      {method.coefficients && (
        <dl className="forecast-card__coeffs">
          <div>
            <dt>Pendenza (a)</dt>
            <dd>
              {formatRegressionCoeff(method.coefficients.slope, fx, {
                unit: '/giorno',
                decimals: 4,
                currency,
              })}
            </dd>
          </div>
          <div>
            <dt>Intercetta (b)</dt>
            <dd>
              {formatRegressionCoeff(method.coefficients.intercept, fx, {
                decimals: 2,
                currency,
              })}
            </dd>
          </div>
        </dl>
      )}

      {method.order && (
        <p className="forecast-card__meta">
          Ordine ARIMA({method.order.p},{method.order.d},{method.order.q})
          {method.phi != null && ` · φ=${method.phi}`}
          {method.theta != null && ` · θ=${method.theta}`}
        </p>
      )}

      {method.lookback != null && (
        <p className="forecast-card__meta">
          Lookback {method.lookback} · hidden {method.hiddenSize} · {method.epochs} epoche
          {method.trainLoss != null && ` · loss ${method.trainLoss}`}
        </p>
      )}

      {method.window != null && method.level == null && !method.order && method.lookback == null && (
        <p className="forecast-card__meta">Finestra: ultimi {method.window} giorni</p>
      )}

      <p className="forecast-card__next">
        Domani (stima):{' '}
        <ForecastPrice usd={method.nextDay} fx={fx} meta={meta} currency={currency} />
      </p>
      <ForecastTable forecasts={method.forecasts} fx={fx} meta={meta} currency={currency} />
    </div>
  );
}

function MethodSection({ title, hint, children }) {
  if (!children) return null;
  return (
    <section className="forecast-cards__section">
      <header className="forecast-cards__section-head">
        <h4 className="forecast-cards__section-title">{title}</h4>
        {hint && <p className="forecast-cards__section-hint">{hint}</p>}
      </header>
      <div className="forecast-cards__section-grid">{children}</div>
    </section>
  );
}

export default function ForecastCards({ forecast, loading, fx, type, symbol, quote }) {
  const meta = getSymbolMeta(symbol, type);
  const currency = inferNativeCurrency(type, quote, symbol);

  if (loading) {
    return (
      <div className="forecast-cards forecast-cards--loading">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
    );
  }

  if (!forecast) return null;

  const methods = forecast.methods ?? {};
  const classicCards = (
    <>
      <MethodCard
        method={methods.sma}
        accentClass="forecast-card--sma"
        fx={fx}
        meta={meta}
        currency={currency}
      />
      <MethodCard
        method={methods.linearRegression}
        accentClass="forecast-card--linear"
        fx={fx}
        meta={meta}
        currency={currency}
      />
      <MethodCard
        method={methods.logReturn}
        accentClass="forecast-card--log"
        fx={fx}
        meta={meta}
        currency={currency}
      />
    </>
  );
  const mlCards = (
    <>
      <MethodCard
        method={methods.prophet}
        accentClass="forecast-card--prophet"
        fx={fx}
        meta={meta}
        currency={currency}
      />
      <MethodCard
        method={methods.arima}
        accentClass="forecast-card--arima"
        fx={fx}
        meta={meta}
        currency={currency}
      />
      <MethodCard
        method={methods.lstm}
        accentClass="forecast-card--lstm"
        fx={fx}
        meta={meta}
        currency={currency}
      />
    </>
  );

  const hasClassic = methods.sma || methods.linearRegression || methods.logReturn;
  const hasMl = methods.prophet || methods.arima || methods.lstm;
  const grouped = hasClassic && hasMl;

  if (!grouped) {
    return (
      <div className="forecast-cards">
        {classicCards}
        {mlCards}
      </div>
    );
  }

  return (
    <div className="forecast-cards forecast-cards--grouped">
      <MethodSection title="Metodi classici" hint="SMA, regressione e log-return">
        {classicCards}
      </MethodSection>
      <MethodSection
        title="Machine Learning"
        hint="ARIMA (viola) e LSTM (rosa) nel grafico"
      >
        {mlCards}
      </MethodSection>
    </div>
  );
}
