import { fmtMoney, fmtPercent, toneFromPct } from '../../utils/portfolioFormat';
import { exportPortfolioPdf } from '../../utils/exportPortfolioPdf';
import Sparkline from '../Sparkline';
import PortfolioHistoryChart from './PortfolioHistoryChart';
import { PortfolioDashboardSkeleton } from './PortfolioSkeleton';

export default function PortfolioDashboard({
  dashboard,
  history,
  historyRange,
  onHistoryRangeChange,
  historyLoading,
  ready,
  refreshing,
  onAdd,
  onNotify,
  onSelectAsset,
  onOpenDetail,
}) {
  const { summary, positions = [] } = dashboard ?? {};
  const baseCcy = summary?.baseCurrency || 'EUR';
  const totalTone = toneFromPct(summary?.totalPlPercent);

  if (!ready) {
    return <PortfolioDashboardSkeleton />;
  }

  return (
    <div className={`portfolio-dashboard${refreshing ? ' portfolio-dashboard--refreshing' : ''}`}>
      <section className="portfolio-summary app-card">
        <header className="portfolio-summary__head">
          <div>
            <p className="portfolio-summary__eyebrow">Valore totale</p>
            <h2 className="portfolio-summary__value">
              {fmtMoney(summary?.totalValue, baseCcy)}
            </h2>
            {summary?.partial && (
              <p className="portfolio-summary__note">Totale parziale: alcune posizioni senza quotazione.</p>
            )}
          </div>
          <div className="portfolio-summary__actions">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => exportPortfolioPdf({ dashboard, history, range: historyRange })}
            >
              PDF
            </button>
            <button type="button" className="btn btn--ghost btn--small" onClick={onNotify}>
              Notifiche
            </button>
            <button type="button" className="btn btn--cta" onClick={onAdd}>
              + Aggiungi
            </button>
          </div>
        </header>
        <div className="portfolio-summary__metrics">
          <div className="portfolio-metric">
            <span className="portfolio-metric__label">P/L totale</span>
            <strong className={`portfolio-metric__value portfolio-metric__value--${totalTone}`}>
              {fmtMoney(summary?.totalPl, baseCcy)}
            </strong>
          </div>
          <div className="portfolio-metric">
            <span className="portfolio-metric__label">P/L %</span>
            <strong className={`portfolio-metric__value portfolio-metric__value--${totalTone}`}>
              {summary?.totalPlPercent != null ? fmtPercent(summary.totalPlPercent) : '—'}
            </strong>
          </div>
          <div className="portfolio-metric">
            <span className="portfolio-metric__label">Posizioni</span>
            <strong className="portfolio-metric__value">{positions.length}</strong>
          </div>
        </div>
      </section>

      <PortfolioHistoryChart
        history={history}
        range={historyRange}
        onRangeChange={onHistoryRangeChange}
        loading={historyLoading}
        currency={baseCcy}
      />

      <section className="portfolio-list app-card">
        <header className="portfolio-list__head">
          <h3>Le tue posizioni</h3>
        </header>

        {!positions.length ? (
          <p className="portfolio-list__empty">
            Nessun asset nel portfolio. Aggiungi la prima posizione.
          </p>
        ) : (
          <ul className="portfolio-list__items">
            {positions.map((pos) => {
              const tone = toneFromPct(pos.plPercent);
              const ccy = pos.currency || pos.quote?.currency || 'USD';
              return (
                <li key={pos.id}>
                  <button
                    type="button"
                    className="portfolio-row"
                    onClick={() => onOpenDetail(pos.symbol)}
                  >
                    <span className="portfolio-row__symbol">{pos.symbol}</span>
                    <span className="portfolio-row__meta">
                      <span className="portfolio-row__qty">
                        {pos.quantity.toLocaleString('it-IT', { maximumFractionDigits: 6 })}
                      </span>
                      <span className="portfolio-row__avg">
                        PM {fmtMoney(pos.avgPrice, ccy)}
                      </span>
                    </span>
                    <span className="portfolio-row__value">
                      <span className="portfolio-row__price">{fmtMoney(pos.currentValue, ccy)}</span>
                      <span className={`portfolio-row__chg portfolio-row__chg--${tone}`}>
                        {pos.plPercent != null ? fmtPercent(pos.plPercent) : '—'}
                      </span>
                    </span>
                    {pos.sparkPoints?.length > 1 && (
                      <Sparkline
                        className="portfolio-row__spark"
                        points={pos.sparkPoints}
                        tone={tone === 'neutral' ? 'auto' : tone}
                        width={56}
                        height={28}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    className="portfolio-row__analyze btn btn--ghost btn--small"
                    onClick={() => onSelectAsset?.(pos.symbol, pos.assetType)}
                  >
                    Analizza →
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
