import { useState } from 'react';
import PortfolioOAuth from './PortfolioOAuth';
import { AUTH0_ENABLED } from '../../auth/PortfolioAuthProvider';

export default function PortfolioAuth({ auth, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'login') await auth.login(email, password, totpCode || undefined);
      else await auth.register(email, password);
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
