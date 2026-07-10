import { useState } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { updateNotificationPreferences } from '../../utils/portfolioApi';
import { DEFAULT_PREFS, NotifyPrefsFieldset } from './PortfolioAuth';

export default function PortfolioAuthOnboarding({ auth, onDone, onSkip }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [prefs, setPrefs] = useState(() => ({
    ...DEFAULT_PREFS,
    ...(auth.user?.notificationPrefs || {}),
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hint, setHint] = useState(null);
  const { supported: pushSupported, subscribe: subscribePush } = usePushNotifications({
    enabled: true,
  });

  const togglePref = (key) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      await updateNotificationPreferences({
        phoneNumber,
        ...prefs,
      });
      if (prefs.pushAlerts && pushSupported) {
        try {
          await subscribePush();
          setHint('Preferenze salvate. Push attivate su questo dispositivo.');
        } catch {
          setHint('Preferenze salvate. Puoi attivare le push da Notifiche.');
        }
      }
      await auth.refreshUser?.();
      onDone?.();
    } catch (err) {
      setError(err.message || 'Salvataggio non riuscito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="portfolio-auth portfolio-auth--onboarding app-card">
      <header className="portfolio-auth__head">
        <h2 className="portfolio-auth__title">Completa il profilo</h2>
        <p className="portfolio-auth__lead">
          Aggiungi un numero di telefono e scegli come ricevere gli alert sul portafoglio.
          {auth.mode === 'auth0' ? ' Accesso Auth0 completato.' : ''}
        </p>
      </header>

      <form className="portfolio-auth__form" onSubmit={handleSubmit}>
        <label className="portfolio-field">
          <span>Telefono (prefisso internazionale)</span>
          <input
            type="tel"
            autoComplete="tel"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="es. +393331234567"
          />
        </label>

        <NotifyPrefsFieldset prefs={prefs} onToggle={togglePref} />

        {error && (
          <p className="portfolio-auth__error" role="alert">
            {error}
          </p>
        )}
        {hint && (
          <p className="portfolio-notify__ok" role="status">
            {hint}
          </p>
        )}

        <div className="portfolio-auth__actions">
          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? 'Salvataggio…' : 'Salva e continua'}
          </button>
          <button type="button" className="btn btn--ghost btn--block" disabled={loading} onClick={onSkip}>
            Salta per ora
          </button>
        </div>
      </form>
    </section>
  );
}
