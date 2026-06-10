import { getSymbolMeta } from '../data/symbols';
import { changeTone, formatChangeBadge, formatCurrentPrice } from '../utils/catalogPrice';
import CategoryIcon from './icons/CategoryIcon';

export default function MobileAssetHero({
  type,
  symbol,
  quote,
  fx,
  loading,
  refreshing = false,
  onAnalyze,
  onForecast,
}) {
  const meta = getSymbolMeta(symbol, type);
  const q = quote?.error ? null : quote;
  const price = formatCurrentPrice(q, meta, fx);
  const chg = formatChangeBadge(q);
  const tone = changeTone(q?.changePercent);

  return (
    <section
      className={`mobile-hero${refreshing ? ' mobile-hero--refreshing' : ''}`}
      aria-label="Asset selezionato"
    >
      <div className={`mobile-hero__avatar mobile-hero__avatar--${type}`} aria-hidden>
        <CategoryIcon id={type} size={24} />
      </div>
      <div className="mobile-hero__body">
        <p className="mobile-hero__name">{meta.name}</p>
        <p className="mobile-hero__meta">
          <code>{symbol}</code>
          {meta.region && <span>{meta.region}</span>}
        </p>
        <p className={`mobile-hero__price mobile-hero__price--${tone}`}>
          {loading && !q?.price ? (
            <span className="mobile-hero__loading">Caricamento…</span>
          ) : (
            <>
              {price.primary}
              {price.unit && <span className="mobile-hero__unit">{price.unit}</span>}
            </>
          )}
        </p>
      </div>
      <div className="mobile-hero__side">
        {chg != null && (
          <span className={`mobile-hero__chg mobile-hero__chg--${tone}`}>{chg}</span>
        )}
        <div className="mobile-hero__actions">
          <button
            type="button"
            className="btn btn--primary mobile-hero__cta"
            onClick={onAnalyze}
            disabled={loading && !q?.price}
          >
            Analizza
          </button>
          {onForecast && (
            <button
              type="button"
              className="btn btn--ghost mobile-hero__cta-secondary"
              onClick={onForecast}
              disabled={loading && !q?.price}
            >
              Prevedi
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
