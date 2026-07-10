import { useEffect, useState } from 'react';
import { portfolioFetch } from '../../utils/portfolioApi';

/** Paper trading simulator — conto virtuale €100k. */
export default function PaperTradingPanel({ symbol, assetType, quote }) {
  const [account, setAccount] = useState(null);
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = () => {
    portfolioFetch('/api/paper/account')
      .then(setAccount)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    refresh();
  }, []);

  const trade = async (side) => {
    setLoading(true);
    setError(null);
    try {
      const price = quote?.price;
      if (!price) throw new Error('Prezzo non disponibile');
      await portfolioFetch('/api/paper/trade', {
        method: 'POST',
        body: JSON.stringify({
          symbol,
          assetType,
          side,
          quantity: Number(qty),
          price,
        }),
      });
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!account) return <p className="portfolio-list__empty">Caricamento paper account…</p>;

  return (
    <section className="paper-trade app-card">
      <h3>Paper Trading</h3>
      <p className="atk-muted">Cash virtuale: €{Number(account.cash).toLocaleString('it-IT')}</p>
      <div className="paper-trade__form">
        <input
          type="number"
          min="0.0001"
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          aria-label="Quantità"
        />
        <button type="button" className="btn btn--primary btn--small" disabled={loading} onClick={() => trade('buy')}>
          Buy
        </button>
        <button type="button" className="btn btn--ghost btn--small" disabled={loading} onClick={() => trade('sell')}>
          Sell
        </button>
      </div>
      {error && <p className="portfolio-auth__error">{error}</p>}
      <ul className="paper-trade__positions">
        {account.positions?.map((p) => (
          <li key={p.symbol}>
            {p.symbol}: {p.quantity} @ {p.avgPrice}
          </li>
        ))}
      </ul>
    </section>
  );
}
