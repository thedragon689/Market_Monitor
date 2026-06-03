import { getSymbolMeta } from '../data/symbols';
import { formatRegressionCoeff } from '../utils/pricing';
import ForecastPrice from './ForecastPrice';

function ForecastTable({ forecasts, fx, meta }) {
  if (!forecasts?.length) return <p className="forecast-card__empty">Nessuna stima disponibile.</p>;
  return (
    <ul className="forecast-list">
      {forecasts.map((row) => (
        <li key={row.dayOffset}>
          <span>Giorno +{row.dayOffset}</span>
          <ForecastPrice usd={row.price} fx={fx} meta={meta} as="div" />
        </li>
      ))}
    </ul>
  );
}

function MethodCard({ method, accentClass, fx, meta }) {
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
          <ForecastPrice usd={method.level} fx={fx} meta={meta} />
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
              })}
            </dd>
          </div>
          <div>
            <dt>Intercetta (b)</dt>
            <dd>{formatRegressionCoeff(method.coefficients.intercept, fx, { decimals: 2 })}</dd>
          </div>
        </dl>
      )}

      {method.window != null && method.level == null && (
        <p className="forecast-card__meta">Finestra: ultimi {method.window} giorni</p>
      )}

      <p className="forecast-card__next">
        Domani (stima): <ForecastPrice usd={method.nextDay} fx={fx} meta={meta} />
      </p>
      <ForecastTable forecasts={method.forecasts} fx={fx} meta={meta} />
    </div>
  );
}

export default function ForecastCards({ forecast, loading, fx, type, symbol }) {
  const meta = getSymbolMeta(symbol, type);

  if (loading) {
    return (
      <div className="forecast-cards forecast-cards--loading">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
    );
  }

  if (!forecast) return null;

  return (
    <div className="forecast-cards">
      <MethodCard method={forecast.methods?.sma} accentClass="forecast-card--sma" fx={fx} meta={meta} />
      <MethodCard
        method={forecast.methods?.linearRegression}
        accentClass="forecast-card--linear"
        fx={fx}
        meta={meta}
      />
      <MethodCard
        method={forecast.methods?.logReturn}
        accentClass="forecast-card--log"
        fx={fx}
        meta={meta}
      />
    </div>
  );
}
