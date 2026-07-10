import { useEffect, useRef, useState } from 'react';
import { fmtMoney } from '../../utils/portfolioFormat';

const ROW_HEIGHT = 56;

function TxRow({ tx, ccy }) {
  return (
    <li className={`portfolio-tx-item portfolio-tx-item--${tx.type}`} style={{ height: ROW_HEIGHT }}>
      <span className="portfolio-tx-item__type">{tx.type === 'buy' ? 'Acquisto' : 'Vendita'}</span>
      <span className="portfolio-tx-item__qty">
        {tx.quantity} × {fmtMoney(tx.price, ccy)}
      </span>
      <span className="portfolio-tx-item__total">{fmtMoney(tx.total, ccy)}</span>
      <time className="portfolio-tx-item__date">{new Date(tx.date).toLocaleDateString('it-IT')}</time>
    </li>
  );
}

/** Virtual scrolling leggero per liste transazioni lunghe. */
export default function VirtualTransactionList({ transactions = [], currency = 'USD', maxHeight = 360 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = transactions.length * ROW_HEIGHT;
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
  const visible = Math.ceil(maxHeight / ROW_HEIGHT) + 4;
  const end = Math.min(transactions.length, start + visible);
  const slice = transactions.slice(start, end);

  useEffect(() => {
    setScrollTop(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [transactions.length]);

  if (!transactions.length) {
    return <p className="portfolio-list__empty">Nessuna transazione registrata.</p>;
  }

  return (
    <div
      ref={containerRef}
      className="portfolio-tx-virtual"
      style={{ maxHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      role="list"
      aria-label="Storico transazioni"
    >
      <ul style={{ height: totalHeight, position: 'relative', margin: 0, padding: 0, listStyle: 'none' }}>
        <div style={{ transform: `translateY(${start * ROW_HEIGHT}px)` }}>
          {slice.map((tx) => (
            <TxRow key={tx.id} tx={tx} ccy={currency} />
          ))}
        </div>
      </ul>
    </div>
  );
}
