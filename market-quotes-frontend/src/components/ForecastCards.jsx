import { getSymbolMeta } from '../data/symbols';
import { inferNativeCurrency } from '../utils/nativeCurrency';
import { formatRegressionCoeff } from '../utils/pricing';
import ForecastPrice from './ForecastPrice';

function ForecastTable({ forecasts, fx, meta, currency }) {
  if (!forecasts?.length) return <p className="forecast-card__empty">Nessuna stima disponibile.</p>;
  return (
    <ul className="forecast-list">
      {forecasts.map((row) => (
        <li key={row.dayOffset} className={row.lower95 != null ? 'forecast-list__row--band' : undefined}>
          <span>Giorno +{row.dayOffset}</span>
          <div className="forecast-list__value">
            <ForecastPrice usd={row.price} fx={fx} meta={meta} currency={currency} as="div" />
            {row.lower95 != null && row.upper95 != null && (
              <span className="forecast-list__band">
                IC 95%:{' '}
                <ForecastPrice usd={row.lower95} fx={fx} meta={meta} currency={currency} as="span" />
                {' – '}
                <ForecastPrice usd={row.upper95} fx={fx} meta={meta} currency={currency} as="span" />
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

const METHOD_LABELS = {
  arima: 'ARIMA',
  lstm: 'LSTM',
  linearRegression: 'Regressione',
  logReturn: 'Log-return',
  prophet: 'Prophet',
  sma: 'SMA',
};

function EnsembleWeights({ members }) {
  if (!members?.length) return null;
  return (
    <div className="forecast-card__block forecast-card__block--weights">
      <span className="forecast-card__block-label">Pesi modelli</span>
      <ul className="forecast-weights">
        {members.map((m) => (
          <li key={m.method}>
            <span className="forecast-weights__name">{METHOD_LABELS[m.method] || m.method}</span>
            <span className="forecast-weights__bar" aria-hidden>
              <span style={{ width: `${Math.round(m.weight * 100)}%` }} />
            </span>
            <span className="forecast-weights__pct">{Math.round(m.weight * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MethodCard({ method, accentClass, fx, meta, currency }) {
  if (!method) return null;
  if (method.error) {
    return (
      <article className={`forecast-card forecast-card--error ${accentClass}`}>
        <div className="forecast-card__block forecast-card__block--error">
          <p>{method.error}</p>
        </div>
      </article>
    );
  }

  return (
    <article className={`forecast-card ${accentClass}`}>
      <div className="forecast-card__block forecast-card__block--head">
        <h4 className="forecast-card__title">{method.label}</h4>
        <p className="forecast-card__formula">{method.formula}</p>
      </div>

      <div className="forecast-card__block forecast-card__block--desc">
        <p className="forecast-card__desc">{method.description}</p>
      </div>

      {fx?.eurUsd && (
        <div className="forecast-card__block forecast-card__block--fx">
          <span className="forecast-card__block-label">Valuta</span>
          <p className="forecast-card__fx-note">
            Stime in <strong>euro</strong>, con riferimento USD tra parentesi (cambio da quotazione).
          </p>
        </div>
      )}

      <div className="forecast-card__block forecast-card__block--metrics">
        {method.level != null && (
          <p className="forecast-card__level">
            <span className="forecast-card__metric-label">Livello media (N={method.window})</span>
            <ForecastPrice usd={method.level} fx={fx} meta={meta} currency={currency} />
          </p>
        )}

        {method.coefficients && (
          <dl className="forecast-card__coeffs">
            <div className="forecast-card__metric-box">
              <dt>Pendenza (a)</dt>
              <dd>
                {formatRegressionCoeff(method.coefficients.slope, fx, {
                  unit: '/giorno',
                  decimals: 4,
                  currency,
                })}
              </dd>
            </div>
            <div className="forecast-card__metric-box">
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
      </div>

      {method.members && <EnsembleWeights members={method.members} />}

      {method.volatilityDaily != null && (
        <p className="forecast-card__meta">
          Volatilità giornaliera σ = {(method.volatilityDaily * 100).toFixed(2)}% · IC 80% e 95%
        </p>
      )}

      <div className="forecast-card__block forecast-card__block--next">
        <span className="forecast-card__block-label">Domani (stima)</span>
        <p className="forecast-card__next">
          <ForecastPrice usd={method.nextDay} fx={fx} meta={meta} currency={currency} />
        </p>
      </div>

      {method.forecasts?.length > 0 && (
        <div className="forecast-card__block forecast-card__block--table">
          <span className="forecast-card__block-label">Orizzonte</span>
          <ForecastTable forecasts={method.forecasts} fx={fx} meta={meta} currency={currency} />
        </div>
      )}
    </article>
  );
}

function MethodSection({ title, hint, children, variant = 'classic' }) {
  if (!children) return null;
  return (
    <section className={`forecast-cards__section forecast-cards__section--${variant}`}>
      <header className="forecast-cards__section-head">
        <h4 className="forecast-cards__section-title">{title}</h4>
        {hint && <p className="forecast-cards__section-hint">{hint}</p>}
      </header>
      <div className="forecast-cards__section-grid">{children}</div>
    </section>
  );
}

export default function ForecastCards({ forecast, loading, fx, type, symbol, quote, history }) {
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

  if (!forecast) {
    const lastPrice = quote?.price ?? history?.[history.length - 1]?.price;
    if (!lastPrice) return null;

    return (
      <div className="forecast-cards forecast-cards--placeholder">
        <div className="forecast-card forecast-card--quote">
          <h4>Ultimo prezzo (storico)</h4>
          <p className="forecast-card__next">
            <ForecastPrice usd={lastPrice} fx={fx} meta={meta} currency={currency} />
          </p>
          <p className="forecast-card__meta">
            Calcola la previsione per popolare i metodi e le stime giorno per giorno.
          </p>
        </div>
      </div>
    );
  }

  const methods = forecast.methods ?? {};
  const ensembleCard =
    methods.ensemble && !methods.ensemble.error ? (
      <MethodSection
        title="Ensemble pesato"
        hint="Media pesata dei modelli · bande di confidenza 80% e 95%"
        variant="ensemble"
      >
        <MethodCard
          method={methods.ensemble}
          accentClass="forecast-card--ensemble forecast-card--hero"
          fx={fx}
          meta={meta}
          currency={currency}
        />
      </MethodSection>
    ) : null;
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
        {ensembleCard}
        {classicCards}
        {mlCards}
      </div>
    );
  }

  return (
    <div className="forecast-cards forecast-cards--grouped">
      {ensembleCard}
      <MethodSection title="Metodi classici" hint="SMA, regressione e log-return" variant="classic">
        {classicCards}
      </MethodSection>
      <MethodSection
        title="Machine Learning"
        hint="ARIMA (viola) e LSTM (rosa) nel grafico"
        variant="ml"
      >
        {mlCards}
      </MethodSection>
    </div>
  );
}
