import { formatPrice } from '../utils/format';

export default function MobileMarketStrip({ summary, fx, updatedAt, loading, refreshing = false }) {
  const quoted = summary
    ? Object.values(summary).reduce((n, s) => n + (s?.quoted ?? 0), 0)
    : null;
  const blocking = loading && !summary;

  return (
    <div
      className={`mobile-market-strip${refreshing ? ' mobile-market-strip--refreshing' : ''}`}
      role="status"
    >
      <span className="mobile-market-strip__pill">
        {blocking ? '…' : `${quoted ?? '—'} live`}
      </span>
      {fx?.eurUsd != null && (
        <span className="mobile-market-strip__fx">€/$ {formatPrice(fx.eurUsd, 'USD')}</span>
      )}
      {updatedAt && !blocking && (
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
