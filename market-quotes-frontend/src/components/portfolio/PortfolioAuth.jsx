import { useState } from 'react';
import PortfolioOAuth from './PortfolioOAuth';
import { AUTH0_ENABLED } from '../../auth/PortfolioAuthProvider';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const DEFAULT_PREFS = {
  pushAlerts: true,
  notifyGain: true,
  notifyLoss: true,
  notifyForecast: true,
  notifyAdvice: true,
};

export default function PortfolioAuth({ auth, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [pushHint, setPushHint] = useState(null);
  const { supported: pushSupported, subscribe: subscribePush } = usePushNotifications({
    enabled: mode === 'register',
  });

  const togglePref = (key) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPushHint(null);
    try {
      if (mode === 'login') {
        await auth.login(email, password, totpCode || undefined);
      } else {
        await auth.register(email, password, {
          phoneNumber,
          notificationPrefs: prefs,
        });
        if (prefs.pushAlerts && pushSupported) {
          try {
            const sub = await subscribePush();
            if (sub) {
              setPushHint('Notifiche push attivate su questo dispositivo.');
            } else {
              setPushHint(
                'Account creato. Attiva le notifiche push da Impostazioni → Notifiche se il browser le ha bloccate.'
              );
            }
          } catch {
            setPushHint('Account creato. Puoi attivare le push da Notifiche nel portfolio.');
          }
        }
      }
      onSuccess?.();
    } catch {
      /* errore mostrato da auth.error */
    }
  };

  return (
    <section className="portfolio-auth app-card">
      <header className="portfolio-auth__head">
        <h2 className="portfolio-auth__title">
          {AUTH0_ENABLED || mode === 'login' ? 'Accedi al Portfolio' : 'Crea account'}
        </h2>
        <p className="portfolio-auth__lead">
          {AUTH0_ENABLED
            ? 'Accesso sicuro con Auth0 e verifica a 2 fattori (MFA) sul tuo account.'
            : mode === 'register'
              ? 'Registrati con telefono per ricevere alert sul portafoglio (push sull’app, anche mobile).'
              : 'Salva le tue posizioni su NeonDB e monitora P/L in tempo reale.'}
        </p>
      </header>

      {AUTH0_ENABLED ? (
        <>
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={auth.loading}
            onClick={() => auth.loginWithRedirect?.() || auth.login()}
          >
            {auth.loading ? 'Attendere…' : 'Accedi con Auth0 (MFA)'}
          </button>
          <p className="portfolio-auth__hint">
            Dopo il login verrai reindirizzato al portfolio. MFA gestito da Auth0 (email/TOTP).
          </p>
        </>
      ) : (
        <>
          <form className="portfolio-auth__form" onSubmit={handleSubmit}>
            <label className="portfolio-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@email.com"
              />
            </label>
            <label className="portfolio-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Maiuscole, minuscole e numero"
              />
            </label>

            {mode === 'register' && (
              <>
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
                <p className="portfolio-auth__hint">
                  Il numero è usato per WhatsApp (se configurato) e come contatto. Le notifiche
                  push arrivano direttamente sull&apos;app installata su questo dispositivo.
                </p>

                <fieldset className="portfolio-notify__prefs">
                  <legend className="portfolio-notify__channel">Alert portafoglio</legend>
                  <label className="portfolio-field portfolio-field--check">
                    <input
                      type="checkbox"
                      checked={prefs.pushAlerts}
                      onChange={() => togglePref('pushAlerts')}
                    />
                    <span>Notifiche push su questo dispositivo</span>
                  </label>
                  <label className="portfolio-field portfolio-field--check">
                    <input
                      type="checkbox"
                      checked={prefs.notifyGain}
                      onChange={() => togglePref('notifyGain')}
                    />
                    <span>Aumenti / soglie guadagno</span>
                  </label>
                  <label className="portfolio-field portfolio-field--check">
                    <input
                      type="checkbox"
                      checked={prefs.notifyLoss}
                      onChange={() => togglePref('notifyLoss')}
                    />
                    <span>Diminuzioni / soglie perdita</span>
                  </label>
                  <label className="portfolio-field portfolio-field--check">
                    <input
                      type="checkbox"
                      checked={prefs.notifyForecast}
                      onChange={() => togglePref('notifyForecast')}
                    />
                    <span>Previsioni di trend</span>
                  </label>
                  <label className="portfolio-field portfolio-field--check">
                    <input
                      type="checkbox"
                      checked={prefs.notifyAdvice}
                      onChange={() => togglePref('notifyAdvice')}
                    />
                    <span>Consigli vendita / riduzione</span>
                  </label>
                </fieldset>
              </>
            )}

            {mode === 'login' && (
              <label className="portfolio-field">
                <span>Codice 2FA (se attivo)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="6 cifre"
                />
              </label>
            )}

            {auth.error && (
              <p className="portfolio-auth__error" role="alert">
                {auth.error}
              </p>
            )}
            {pushHint && <p className="portfolio-notify__ok">{pushHint}</p>}

            <button type="submit" className="btn btn--primary btn--block" disabled={auth.loading}>
              {auth.loading ? 'Attendere…' : mode === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          </form>

          <PortfolioOAuth
            disabled={auth.loading}
            onOAuth={async (provider, payload) => {
              await auth.loginWithOAuth(provider, payload);
              onSuccess?.();
            }}
            onError={(msg) => auth.setError?.(msg)}
          />
        </>
      )}

      {!AUTH0_ENABLED && (
        <p className="portfolio-auth__switch">
          {mode === 'login' ? (
            <>
              Non hai un account?{' '}
              <button type="button" className="portfolio-link" onClick={() => setMode('register')}>
                Registrati
              </button>
            </>
          ) : (
            <>
              Hai già un account?{' '}
              <button type="button" className="portfolio-link" onClick={() => setMode('login')}>
                Accedi
              </button>
            </>
          )}
        </p>
      )}
    </section>
  );
}
