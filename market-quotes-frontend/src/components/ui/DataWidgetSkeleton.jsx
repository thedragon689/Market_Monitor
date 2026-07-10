import Skeleton, { SkeletonText } from './Skeleton';

/** Placeholder grafico (candele, storico, previsione). */
export function ChartWidgetSkeleton({ className = '', label = 'Caricamento grafico…', tall = false }) {
  return (
    <div
      className={`data-widget-skel data-widget-skel--chart ${tall ? 'data-widget-skel--tall' : ''} ${className}`.trim()}
      aria-busy="true"
      role="status"
    >
      <div className="skeleton skeleton--chart data-widget-skel__chart" aria-hidden />
      {label ? <span className="data-widget-skel__label">{label}</span> : null}
    </div>
  );
}

/** Pannello dati generico (intelligence, geopolitica, consigli). */
export function PanelWidgetSkeleton({
  className = '',
  label = 'Caricamento dati…',
  lines = 4,
  withHeader = true,
}) {
  return (
    <div className={`data-widget-skel data-widget-skel--panel ${className}`.trim()} aria-busy="true" role="status">
      {withHeader ? <div className="skeleton skeleton--title data-widget-skel__title" aria-hidden /> : null}
      <SkeletonText lines={lines} className="data-widget-skel__text" />
      {label ? <span className="data-widget-skel__label">{label}</span> : null}
    </div>
  );
}

/** Griglia di card KPI / previsioni. */
export function CardsWidgetSkeleton({ className = '', count = 3, label = 'Caricamento…' }) {
  return (
    <div className={`data-widget-skel data-widget-skel--cards ${className}`.trim()} aria-busy="true" role="status">
      <div className="data-widget-skel__card-row" aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton skeleton--card data-widget-skel__card" />
        ))}
      </div>
      {label ? <span className="data-widget-skel__label">{label}</span> : null}
    </div>
  );
}

/** Tabella / heatmap correlazioni. */
export function TableWidgetSkeleton({ className = '', rows = 5, label = 'Caricamento tabella…' }) {
  return (
    <div className={`data-widget-skel data-widget-skel--table ${className}`.trim()} aria-busy="true" role="status">
      <div className="data-widget-skel__table" aria-hidden>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton skeleton--line data-widget-skel__row" />
        ))}
      </div>
      {label ? <span className="data-widget-skel__label">{label}</span> : null}
    </div>
  );
}

/** Hero prezzo mobile compatto. */
export function HeroPriceSkeleton({ className = '' }) {
  return (
    <div className={`data-widget-skel data-widget-skel--hero ${className}`.trim()} aria-busy="true" role="status">
      <div className="skeleton skeleton--title" aria-hidden />
      <div className="skeleton skeleton--price" aria-hidden />
      <div className="skeleton skeleton--line data-widget-skel__line--short" aria-hidden />
    </div>
  );
}
