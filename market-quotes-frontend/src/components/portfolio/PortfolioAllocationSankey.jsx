import { fmtMoney, fmtPercent } from '../../utils/portfolioFormat';

/** Sankey-style allocation flow (semplificato con barre proporzionali). */
export default function PortfolioAllocationSankey({ positions = [], currency = 'EUR' }) {
  const total = positions.reduce((s, p) => s + (p.currentValueBase ?? p.currentValue ?? 0), 0);
  if (!total) return <p className="portfolio-list__empty">Nessuna allocazione da visualizzare.</p>;

  const slices = positions
    .map((p) => ({
      symbol: p.symbol,
      value: p.currentValueBase ?? p.currentValue ?? 0,
      pct: ((p.currentValueBase ?? p.currentValue ?? 0) / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="pf-sankey app-card" role="img" aria-label="Allocazione portfolio">
      <h3>Flussi allocazione</h3>
      <div className="pf-sankey__bar">
        {slices.map((s) => (
          <div
            key={s.symbol}
            className="pf-sankey__seg"
            style={{ flex: s.pct }}
            title={`${s.symbol} ${fmtPercent(s.pct)}`}
          />
        ))}
      </div>
      <ul className="pf-sankey__legend">
        {slices.map((s) => (
          <li key={s.symbol}>
            <span>{s.symbol}</span>
            <span>{fmtPercent(s.pct)}</span>
            <span>{fmtMoney(s.value, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
