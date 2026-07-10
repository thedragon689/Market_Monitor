import { PortfolioDashboardSkeleton } from './PortfolioSkeleton';

/** Fallback Suspense allineato al layout finale — evita salti tra skeleton generici e dashboard. */
export default function PortfolioViewFallback() {
  return (
    <div className="portfolio-page" aria-busy="true">
      <header className="portfolio-page__head">
        <div className="portfolio-page__intro">
          <h1 className="portfolio-page__title">Portfolio</h1>
          <p className="portfolio-page__lead">
            Gestisci posizioni, transazioni e monitora P/L in tempo reale.
          </p>
        </div>
      </header>
      <PortfolioDashboardSkeleton />
    </div>
  );
}
