import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function PushSubscribeButton() {
  const { supported, permission, subscribed, subscribe, unsubscribe } = usePushNotifications({
    enabled: true,
  });

  if (!supported) {
    return <p className="portfolio-notify__hint">Push non supportate su questo browser.</p>;
  }

  const label =
    permission === 'denied'
      ? 'Notifiche bloccate nelle impostazioni del browser'
      : subscribed
        ? 'Push attive su questo dispositivo'
        : 'Attiva notifiche push';

  return (
    <div className="portfolio-notify__push-actions">
      <p className="portfolio-notify__hint">
        Stato: <strong>{permission}</strong>
        {subscribed ? ' · iscritto' : ''}
      </p>
      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={permission === 'denied'}
        onClick={() => (subscribed ? unsubscribe() : subscribe())}
      >
        {subscribed ? 'Disattiva push' : label}
      </button>
    </div>
  );
}
