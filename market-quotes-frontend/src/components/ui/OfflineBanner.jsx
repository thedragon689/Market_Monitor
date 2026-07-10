import { useOffline } from '../../hooks/useOffline';

/** Banner fisso che segnala la modalità offline (dati da cache). */
export default function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div className="ui-offline-banner" role="status" aria-live="polite">
      <span className="ui-offline-banner__dot" aria-hidden="true" />
      Sei offline · dati mostrati dalla cache
    </div>
  );
}
