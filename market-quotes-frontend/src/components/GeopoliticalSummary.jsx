import ForecastPrice from './ForecastPrice';
import { PanelWidgetSkeleton } from './ui/DataWidgetSkeleton';

export default function GeopoliticalSummary({ geo, fx, meta, loading }) {
  if (loading && !geo) {
    return (
      <PanelWidgetSkeleton className="geo-summary geo-summary--loading" label="Analisi geopolitica…" lines={3} />
    );
  }
  if (!geo) return null;

  const idx = geo.geopoliticalIndex ?? 0;
  const c = geo.combined;

  return (
    <div className="geo-summary">
      <div className="geo-summary__grid">
        <div className="geo-summary__card">
          <span className="geo-summary__label">Indice geopolitico</span>
          <strong className={idx >= 0 ? 'geo-summary__val--pos' : 'geo-summary__val--neg'}>
            {idx > 0 ? '+' : ''}
            {idx}
          </strong>
          <span className="geo-summary__hint">1% di aggiustamento per punto</span>
        </div>
        <div className="geo-summary__card">
          <span className="geo-summary__label">Base tecnica</span>
          <ForecastPrice usd={geo.technicalBase ?? geo.baseForecast} fx={fx} meta={meta} as="strong" />
        </div>
        <div className="geo-summary__card">
          <span className="geo-summary__label">Dopo geopolitica</span>
          <ForecastPrice usd={geo.adjustedForecast} fx={fx} meta={meta} as="strong" />
        </div>
        <div className="geo-summary__card geo-summary__card--accent">
          <span className="geo-summary__label">Combinata (tecnico + geo + vol)</span>
          <ForecastPrice usd={geo.combinedForecast} fx={fx} meta={meta} as="strong" />
          {c?.weights && (
            <span className="geo-summary__hint">
              Pesi {Math.round(c.weights.technical * 100)}% /{' '}
              {Math.round(c.weights.geopolitical * 100)}% /{' '}
              {Math.round(c.weights.volatility * 100)}%
            </span>
          )}
        </div>
      </div>

      {geo.sentimentSummary && (
        <p className="geo-summary__sentiment">
          Sentiment notizie: {geo.sentimentSummary.positive} positive ·{' '}
          {geo.sentimentSummary.negative} negative · {geo.sentimentSummary.neutral} neutre
        </p>
      )}
    </div>
  );
}
