import { useEffect, useState } from 'react';
import { portfolioFetch } from '../../utils/portfolioApi';
import { fmtMoney, fmtPercent } from '../../utils/portfolioFormat';
import PortfolioAllocationSankey from './PortfolioAllocationSankey';

function RebalancePanel() {
  const [data, setData] = useState(null);
  useEffect(() => {
    portfolioFetch('/api/portfolio/rebalance?mode=equal')
      .then(setData)
      .catch(() => setData(null));
  }, []);
  if (!data?.suggestions?.length) {
    return <p className="portfolio-list__empty">Portfolio bilanciato o dati insufficienti.</p>;
  }
  return (
    <ul className="pf-insights__list">
      {data.suggestions.map((s) => (
        <li key={s.symbol}>
          <strong>{s.symbol}</strong> — {s.action === 'buy' ? 'Acquista' : 'Vendi'} ~
          {s.estimatedQty} ({s.deltaWeightPct}%)
        </li>
      ))}
    </ul>
  );
}

function TaxLossPanel() {
  const [data, setData] = useState(null);
  useEffect(() => {
    portfolioFetch('/api/portfolio/tax-loss')
      .then(setData)
      .catch(() => setData(null));
  }, []);
  if (!data?.candidates?.length) {
    return <p className="portfolio-list__empty">Nessuna opportunità tax-loss evidente.</p>;
  }
  return (
    <>
      <p className="atk-muted">{data.summary?.disclaimer}</p>
      <ul className="pf-insights__list">
        {data.candidates.map((c) => (
          <li key={c.symbol}>
            <strong>{c.symbol}</strong> {fmtMoney(c.pl)} ({fmtPercent(c.plPercent)})
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PortfolioInsights({ dashboard }) {
  const ccy = dashboard?.summary?.baseCurrency || 'EUR';
  return (
    <div className="pf-insights">
      <PortfolioAllocationSankey positions={dashboard?.positions} currency={ccy} />
      <section className="app-card">
        <h3>Rebalancing suggerito</h3>
        <RebalancePanel />
      </section>
      <section className="app-card">
        <h3>Tax-loss harvesting</h3>
        <TaxLossPanel />
      </section>
    </div>
  );
}
