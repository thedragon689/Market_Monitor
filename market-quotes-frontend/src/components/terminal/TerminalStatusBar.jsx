import { formatPrice } from '../../utils/format';

export default function TerminalStatusBar({ summary, updatedAt, fx, quotedTotal, loading }) {
  const categories = summary
    ? [
        { label: 'Azioni', n: summary.stocks?.quoted, t: summary.stocks?.total },
        { label: 'Indici', n: summary.indices?.quoted, t: summary.indices?.total },
        { label: 'Crypto', n: summary.crypto?.quoted, t: summary.crypto?.total },
        { label: 'Forex', n: summary.forex?.quoted, t: summary.forex?.total },
        { label: 'ETF', n: summary.etf?.quoted, t: summary.etf?.total },
      ].filter((c) => c.t)
    : [];

  return (
    <div className="terminal-status" role="status">
      <div className="terminal-status__left">
        <span className="terminal-status__label">Mercati live</span>
        {loading ? (
          <span className="terminal-status__pill">Aggiornamento…</span>
        ) : (
          <span className="terminal-status__pill terminal-status__pill--ok">
            {quotedTotal ?? '—'} asset quotati
          </span>
        )}
        {categories.map((c) => (
          <span key={c.label} className="terminal-status__chip">
            {c.label} {c.n ?? 0}/{c.t}
          </span>
        ))}
      </div>
      <div className="terminal-status__right">
        {fx?.eurUsd != null && (
          <span className="terminal-status__fx">
            EUR/USD {formatPrice(fx.eurUsd, 'USD')}
          </span>
        )}
        {updatedAt && (
          <time className="terminal-status__time" dateTime={updatedAt}>
            Agg. {new Date(updatedAt).toLocaleString('it-IT', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        )}
      </div>
    </div>
  );
}
