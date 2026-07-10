/** Placeholder skeleton coerenti per il portfolio. */
export function PortfolioRowSkeleton() {
  return (
    <div className="portfolio-skel-row" aria-hidden>
      <span className="skeleton portfolio-skel-row__avatar" />
      <span className="portfolio-skel-row__lines">
        <span className="skeleton skeleton--line portfolio-skel-row__line" />
        <span className="skeleton skeleton--line portfolio-skel-row__line portfolio-skel-row__line--short" />
      </span>
      <span className="skeleton portfolio-skel-row__spark" />
    </div>
  );
}

export function PortfolioDashboardSkeleton() {
  return (
    <div className="portfolio-dashboard portfolio-dashboard--loading" aria-busy="true" aria-label="Caricamento portfolio">
      <section className="portfolio-summary app-card portfolio-skeleton-card">
        <header className="portfolio-summary__head">
          <div className="portfolio-skeleton-summary__value-block">
            <div className="skeleton skeleton--line portfolio-skel-eyebrow" />
            <div className="skeleton skeleton--portfolio-hero" />
          </div>
          <div className="portfolio-summary__actions portfolio-skeleton-summary__actions">
            <div className="skeleton skeleton--portfolio-btn" />
            <div className="skeleton skeleton--portfolio-btn skeleton--portfolio-btn--cta" />
          </div>
        </header>
        <div className="portfolio-skeleton-metrics">
          <div className="skeleton skeleton--portfolio-metric" />
          <div className="skeleton skeleton--portfolio-metric" />
          <div className="skeleton skeleton--portfolio-metric" />
        </div>
      </section>
      <section className="portfolio-chart app-card portfolio-skeleton-card">
        <header className="portfolio-chart__head">
          <div className="skeleton skeleton--line portfolio-skel-title" />
          <div className="portfolio-skeleton-ranges">
            <div className="skeleton skeleton--portfolio-range" />
            <div className="skeleton skeleton--portfolio-range" />
            <div className="skeleton skeleton--portfolio-range" />
            <div className="skeleton skeleton--portfolio-range" />
            <div className="skeleton skeleton--portfolio-range" />
          </div>
        </header>
        <div className="portfolio-chart__stage">
          <div className="skeleton skeleton--portfolio-chart" />
        </div>
      </section>
      <section className="portfolio-list app-card portfolio-skeleton-card">
        <div className="skeleton skeleton--line portfolio-skel-title" />
        <PortfolioRowSkeleton />
        <PortfolioRowSkeleton />
        <PortfolioRowSkeleton />
      </section>
    </div>
  );
}

export function PortfolioDetailSkeleton() {
  return (
    <div className="portfolio-detail portfolio-detail--loading" aria-busy="true">
      <section className="portfolio-detail__hero app-card portfolio-skeleton-card">
        <div className="skeleton skeleton--line portfolio-skel-back" />
        <div className="skeleton skeleton--portfolio-hero portfolio-skel-symbol" />
        <div className="portfolio-skeleton-metrics portfolio-skeleton-metrics--detail">
          <div className="skeleton skeleton--portfolio-metric" />
          <div className="skeleton skeleton--portfolio-metric" />
          <div className="skeleton skeleton--portfolio-metric" />
          <div className="skeleton skeleton--portfolio-metric" />
        </div>
      </section>
      <section className="portfolio-chart app-card portfolio-skeleton-card">
        <div className="skeleton skeleton--portfolio-chart portfolio-skeleton-chart--sm" />
      </section>
    </div>
  );
}
