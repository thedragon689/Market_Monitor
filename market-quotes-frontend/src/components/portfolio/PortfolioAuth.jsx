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

const AUTH_FEATURES = [
  'Salva posizioni e transazioni su cloud sicuro',
  'Monitora P/L e performance in tempo reale',
  'Alert push su guadagni, perdite e previsioni',
];

function NotifyPrefsFieldset({ prefs, onToggle }) {
  return (
    <fieldset className="portfolio-notify__prefs">
      <legend className="portfolio-notify__channel">Alert portafoglio</legend>
      <label className="portfolio-field portfolio-field--check">
        <input
          type="checkbox"
          checked={prefs.pushAlerts}
          onChange={() => onToggle('pushAlerts')}
        />
        <span>Notifiche push su questo dispositivo</span>
      </label>
      <label className="portfolio-field portfolio-field--check">
        <input
          type="checkbox"
          checked={prefs.notifyGain}
          onChange={() => onToggle('notifyGain')}
        />
        <span>Aumenti / soglie guadagno</span>
      </label>
      <label className="portfolio-field portfolio-field--check">
        <input
          type="checkbox"
          checked={prefs.notifyLoss}
          onChange={() => onToggle('notifyLoss')}
        />
        <span>Diminuzioni / soglie perdita</span>
      </label>
      <label className="portfolio-field portfolio-field--check">
        <input
          type="checkbox"
          checked={prefs.notifyForecast}
          onChange={() => onToggle('notifyForecast')}
        />
        <span>Previsioni di trend</span>
      </label>
      <label className="portfolio-field portfolio-field--check">
        <input
          type="checkbox"
          checked={prefs.notifyAdvice}
          onChange={() => onToggle('notifyAdvice')}
        />
        <span>Consigli vendita / riduzione</span>
      </label>
    </fieldset>
  );
}

export default function PortfolioAuth({
  auth,
  onSuccess,
  initialError = null,
  mfaRequired = false,
}) {
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
            setPushHint(
              sub
                ? 'Notifiche push attivate su questo dispositivo.'
                : 'Account creato. Attiva le push da Notifiche se il browser le ha bloccate.'
            );
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

  const displayError = auth.error || initialError;

  return (
    <section className="portfolio-auth app-card">
      <header className="portfolio-auth__head">
        <div className="portfolio-auth__head-row">
          <h2 className="portfolio-auth__title">
            {AUTH0_ENABLED || mode === 'login' ? 'Accedi al Portfolio' : 'Crea account'}
          </h2>
          <span className={`portfolio-auth__mode portfolio-auth__mode--${AUTH0_ENABLED ? 'auth0' : 'legacy'}`}>
            {AUTH0_ENABLED ? 'Auth0' : 'Account locale'}
          </span>
        </div>
        <p className="portfolio-auth__lead">
          {AUTH0_ENABLED
            ? 'Accesso centralizzato con MFA. Dopo il login potrai configurare telefono e alert.'
            : mode === 'register'
              ? 'Registrati con telefono per ricevere alert sul portafoglio.'
              : 'Accedi per salvare posizioni e monitorare P/L in tempo reale.'}
        </p>
      </header>

      <ul className="portfolio-auth__features" aria-label="Funzionalità portfolio">
        {AUTH_FEATURES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {mfaRequired && (
        <p className="portfolio-auth__alert portfolio-auth__alert--info" role="status">
          Autenticazione a 2 fattori richiesta. Completa la verifica Auth0 e riprova.
        </p>
      )}

      {displayError && (
        <p className="portfolio-auth__error" role="alert">
          {displayError}
        </p>
      )}

      {AUTH0_ENABLED ? (
        <div className="portfolio-auth__auth0">
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={auth.loading}
            onClick={() => auth.loginWithRedirect?.() || auth.login()}
          >
            {auth.loading ? 'Attendere…' : 'Continua con Auth0'}
          </button>
          <p className="portfolio-auth__hint">
            Verrai reindirizzato al login sicuro Auth0. Al ritorno configurerai telefono e notifiche.
          </p>
        </div>
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
                  Usato per WhatsApp (se configurato) e come contatto. Le push arrivano su questo
                  dispositivo.
                </p>
                <NotifyPrefsFieldset prefs={prefs} onToggle={togglePref} />
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

export { NotifyPrefsFieldset, DEFAULT_PREFS };
