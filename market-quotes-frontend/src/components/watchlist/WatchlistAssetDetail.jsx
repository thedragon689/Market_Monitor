import { Suspense, lazy } from 'react';
import Modal from '../ui/Modal';
import { TYPE_LABELS } from '../../data/allSymbols';

const CandlestickChart = lazy(() => import('../CandlestickChart'));

function formatPrice(quote) {
  const price = Number(quote?.price);
  if (!Number.isFinite(price)) return '—';
  const currency = quote?.currency || 'USD';
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
      maximumFractionDigits: price >= 100 ? 2 : 4,
    }).format(price);
  } catch {
    return price.toLocaleString('it-IT');
  }
}

/** Scheda dettaglio watchlist: candlestick + statistiche chiave, in un Modal. */
export default function WatchlistAssetDetail({ row, onClose, onOpenAnalysis }) {
  if (!row) return null;
  const quote = row.quote || {};
  const pct = Number(quote.changePercent);
  const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  const pctLabel = Number.isFinite(pct)
    ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
    : '—';

  return (
    <Modal
      open={Boolean(row)}
      onClose={onClose}
      title={`${row.name || row.symbol} · ${row.symbol}`}
    >
      <div className="wl-detail">
        <div className="wl-detail__stats">
          <span className="wl-detail__price">{formatPrice(quote)}</span>
          <span className={`wl-detail__chg wl-detail__chg--${dir}`}>{pctLabel}</span>
          <span className="wl-detail__type">{TYPE_LABELS[row.type] || row.type}</span>
        </div>

        <Suspense fallback={<div className="wl-detail__loading">Caricamento grafico…</div>}>
          <CandlestickChart symbol={row.symbol} type={row.type} height={340} defaultTf="6M" />
        </Suspense>

        <div className="wl-detail__actions">
          <button type="button" className="ui-btn ui-btn--outline ui-btn--sm" onClick={onClose}>
            Chiudi
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--primary ui-btn--sm"
            onClick={onOpenAnalysis}
          >
            Analisi completa →
          </button>
        </div>
      </div>
    </Modal>
  );
}
