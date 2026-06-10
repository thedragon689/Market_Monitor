import { useCallback, useState } from 'react';
import { buildShareUrl, copyShareUrl } from '../utils/shareUrl';

export default function AppToolbar({
  shareState,
  loadingMarket,
  refreshing = false,
  quoteReady,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyShareUrl(shareState);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [shareState]);

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(shareState);
    if (navigator.share && url) {
      try {
        await navigator.share({
          title: 'Market Monitor',
          text: `${shareState.symbol} — analisi e previsioni`,
          url,
        });
        return;
      } catch {
        /* fallback copy */
      }
    }
    handleCopy();
  }, [shareState, handleCopy]);

  return (
    <div className="app-toolbar">
      <div className="app-toolbar__status">
        <span
          className={`status-pill ${
            loadingMarket
              ? 'status-pill--busy'
              : refreshing
                ? 'status-pill--refresh'
                : quoteReady
                  ? 'status-pill--ok'
                  : 'status-pill--idle'
          }`}
        >
          {loadingMarket
            ? 'Caricamento…'
            : refreshing
              ? 'Aggiornamento…'
              : quoteReady
                ? 'Dati pronti'
                : 'In attesa asset'}
        </span>
      </div>
      <div className="app-toolbar__actions">
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={handleCopy}
          title="Copia link a questa vista"
        >
          {copied ? 'Copiato ✓' : 'Copia link'}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={handleShare}
        >
          Condividi
        </button>
      </div>
    </div>
  );
}
