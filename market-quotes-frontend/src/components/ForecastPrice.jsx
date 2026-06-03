import { formatForecastDual } from '../utils/pricing';

/** Prezzo previsione con euro in evidenza e dollaro di riferimento. */
export default function ForecastPrice({ usd, fx, meta, as = 'span' }) {
  const { primary, secondary } = formatForecastDual(usd, fx, meta);
  const Tag = as;

  return (
    <Tag className="forecast-price">
      <strong className="forecast-price__eur">{primary}</strong>
      {secondary && <span className="forecast-price__usd"> ({secondary})</span>}
    </Tag>
  );
}
