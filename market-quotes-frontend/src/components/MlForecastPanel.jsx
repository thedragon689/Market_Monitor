import { getSymbolMeta } from '../data/symbols';
import { inferNativeCurrency } from '../utils/nativeCurrency';
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

function MlModelCard({ model, accentClass, fx, meta, currency }) {
  if (!model) return null;

  return (
    <article className={`forecast-card ${accentClass}`}>
      <h4>{model.label}</h4>
      {model.formula && <p className="forecast-card__formula">{model.formula}</p>}
      {model.description && <p className="forecast-card__desc">{model.description}</p>}

      {model.coefficients && (
        <dl className="forecast-card__coeffs">
          <div>
            <dt>a</dt>
            <dd>{model.coefficients.a?.toFixed(4)}</dd>
          </div>
          <div>
            <dt>b</dt>
            <dd>{model.coefficients.b?.toFixed(4)}</dd>
          </div>
          <div>
            <dt>c</dt>
            <dd>{model.coefficients.c?.toFixed(6)}</dd>
          </div>
        </dl>
      )}

      {model.trees != null && (
        <p className="forecast-card__meta">
          {model.trees} alberi · ensemble bootstrap deterministico
        </p>
      )}

      <p className="forecast-card__next">
        Domani (stima):{' '}
        <ForecastPrice usd={model.nextDay ?? model.nextPrice} fx={fx} meta={meta} currency={currency} />
      </p>
      <ForecastTable forecasts={model.forecasts} fx={fx} meta={meta} currency={currency} />
    </article>
  );
}

export default function MlForecastPanel({ intelligence, loading, type, symbol, quote, fx, compact = false }) {
  const poly = intelligence?.ml?.polynomial;
  const rf = intelligence?.ml?.randomForest;

  if (loading && !intelligence) {
    return (
      <div className="ml-forecast-panel ml-forecast-panel--loading">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
    );
  }

  if (!poly && !rf) {
    return (
      <p className="ml-forecast-panel__empty">
        Modelli avanzati non disponibili — servono almeno 12–28 giorni di storico e intelligence caricata.
      </p>
    );
  }

  const meta = getSymbolMeta(symbol, type);
  const currency = inferNativeCurrency(type, quote, symbol);

  return (
    <div className={`ml-forecast-panel ${compact ? 'ml-forecast-panel--compact' : ''}`}>
      {!compact && (
        <p className="ml-forecast-panel__lead">
          Modelli del motore intelligence: regressione polinomiale e Random Forest su feature di mercato,
          sentiment e volatilità.
        </p>
      )}
      <div className="ml-forecast-panel__grid">
        <MlModelCard
          model={poly}
          accentClass="forecast-card--poly"
          fx={fx}
          meta={meta}
          currency={currency}
        />
        <MlModelCard
          model={rf}
          accentClass="forecast-card--rf"
          fx={fx}
          meta={meta}
          currency={currency}
        />
      </div>
    </div>
  );
}
