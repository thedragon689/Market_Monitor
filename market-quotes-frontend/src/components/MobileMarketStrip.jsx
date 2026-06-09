import { formatPrice } from '../utils/format';

export default function MobileMarketStrip({ summary, fx, updatedAt, loading }) {
  const quoted = summary
    ? Object.values(summary).reduce((n, s) => n + (s?.quoted ?? 0), 0)
    : null;

  return (
    <div className="mobile-market-strip" role="status">
      <span className="mobile-market-strip__pill">
        {loading ? '…' : `${quoted ?? '—'} live`}
      </span>
      {fx?.eurUsd != null && (
        <span className="mobile-market-strip__fx">€/$ {formatPrice(fx.eurUsd, 'USD')}</span>
      )}
      {updatedAt && !loading && (
        <time className="mobile-market-strip__time" dateTime={updatedAt}>
          {new Date(updatedAt).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      )}
    </div>
  );
}
