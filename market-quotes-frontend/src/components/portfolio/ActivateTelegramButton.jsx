import { useEffect, useState } from 'react';
import { createTelegramLink, getNotificationsConfig } from '../../utils/portfolioApi';

/**
 * Apre il bot Telegram con /start <userId> per collegare automaticamente il chat_id.
 */
export default function ActivateTelegramButton({
  label = 'Attiva notifiche Telegram',
  className = 'btn btn--cta btn--block',
  disabled = false,
  onOpened,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [telegramEnabled, setTelegramEnabled] = useState(null);
  const [botUsername, setBotUsername] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getNotificationsConfig()
      .then((cfg) => {
        if (cancelled) return;
        setTelegramEnabled(cfg?.telegram === true);
        setBotUsername(cfg?.telegramBotUsername ?? null);
      })
      .catch(() => {
        if (!cancelled) setTelegramEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activate = async () => {
    setLoading(true);
    setError(null);
    try {
      const link = await createTelegramLink();
      if (!link?.deepLink) {
        throw new Error(
          link?.botUsername
            ? 'Impossibile aprire Telegram. Riprova tra poco.'
            : 'Bot Telegram non configurato sul server (manca TELEGRAM_BOT_TOKEN o username).'
        );
      }
      window.open(link.deepLink, '_blank', 'noopener,noreferrer');
      onOpened?.(link);
    } catch (err) {
      setError(err.message || 'Collegamento Telegram non riuscito');
    } finally {
      setLoading(false);
    }
  };

  if (telegramEnabled === false) {
    return (
      <p className="portfolio-notify__hint">
        Telegram non configurato sul server (manca <code>TELEGRAM_BOT_TOKEN</code>).
      </p>
    );
  }

  return (
    <div className="portfolio-telegram-activate">
      {botUsername && (
        <p className="portfolio-notify__hint">
          Bot: <strong>@{botUsername}</strong> — dopo /start il chat_id viene salvato automaticamente.
        </p>
      )}
      <button
        type="button"
        className={className}
        onClick={activate}
        disabled={disabled || loading || telegramEnabled === null}
      >
        {loading ? 'Apertura Telegram…' : label}
      </button>
      {error && (
        <p className="portfolio-auth__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
