import { useCallback, useState } from 'react';
import { disableTotp, enableTotp, setupTotp } from '../../utils/portfolioApi';

function formatSecret(secret) {
  return String(secret || '')
    .replace(/[^A-Za-z2-7]/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function qrImageUrl(uri) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(uri)}`;
}

export default function PortfolioTotpSetup({ auth, onBack }) {
  const totpActive = Boolean(auth.user?.totpEnabled);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  const startSetup = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setCode('');
    try {
      const data = await setupTotp();
      setSetup(data);
    } catch (err) {
      setError(err.message || 'Impossibile avviare la configurazione 2FA');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEnable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await enableTotp(code.replace(/\s/g, ''));
      await auth.refreshUser?.();
      setSetup(null);
      setCode('');
      setMessage('Autenticazione a due fattori attivata. Al prossimo accesso ti verrà chiesto il codice.');
    } catch (err) {
      setError(err.message || 'Codice non valido');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await disableTotp({
        password: password || undefined,
        code: code.replace(/\s/g, '') || undefined,
      });
      await auth.refreshUser?.();
      setPassword('');
      setCode('');
      setSetup(null);
      setMessage('2FA disattivata.');
    } catch (err) {
      setError(err.message || 'Disattivazione non riuscita');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!setup?.secret) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copia non riuscita. Seleziona il codice manualmente.');
    }
  };

  return (
    <section className="portfolio-totp app-card">
      <header className="portfolio-add__head">
        <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>
          ← Indietro
        </button>
        <h2>Autenticazione 2FA</h2>
      </header>

      <p className="portfolio-totp__lead">
        Proteggi l&apos;account con un codice temporaneo generato da un&apos;app autenticatore
        (Google Authenticator, Authy, 1Password, ecc.).
      </p>

      {totpActive && (
        <p className="portfolio-totp__status" role="status">
          <span className="portfolio-totp__badge">Attivo</span>
          La 2FA è attiva su questo account.
        </p>
      )}

      {message && (
        <p className="portfolio-notify__ok" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="portfolio-auth__error" role="alert">
          {error}
        </p>
      )}

      {totpActive ? (
        <form className="portfolio-auth__form portfolio-totp__form" onSubmit={handleDisable}>
          <h3 className="portfolio-totp__step-title">Disattiva 2FA</h3>
          <p className="portfolio-auth__hint">
            Inserisci il codice corrente dall&apos;app autenticatore. Puoi aggiungere la password
            dell&apos;account per conferma.
          </p>
          <label className="portfolio-field">
            <span>Codice a 6 cifre</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={8}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ''))}
              placeholder="000000"
            />
          </label>
          <label className="portfolio-field">
            <span>Password (opzionale)</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password account"
            />
          </label>
          <button type="submit" className="btn btn--ghost btn--block" disabled={loading}>
            {loading ? 'Attendere…' : 'Disattiva 2FA'}
          </button>
        </form>
      ) : setup ? (
        <form className="portfolio-auth__form portfolio-totp__form" onSubmit={handleEnable}>
          <h3 className="portfolio-totp__step-title">1. Aggiungi l&apos;account all&apos;app</h3>
          <p className="portfolio-auth__hint">
            Scansiona il QR oppure inserisci manualmente la chiave segreta nell&apos;app
            autenticatore.
          </p>

          <div className="portfolio-totp__qr-wrap">
            <img
              className="portfolio-totp__qr"
              src={qrImageUrl(setup.uri)}
              alt="QR code per app autenticatore"
              width={200}
              height={200}
              loading="lazy"
            />
          </div>

          <div className="portfolio-totp__secret">
            <span className="portfolio-totp__secret-label">Chiave manuale</span>
            <code className="portfolio-totp__secret-value">{formatSecret(setup.secret)}</code>
            <button type="button" className="btn btn--ghost btn--small" onClick={copySecret}>
              {copied ? 'Copiato' : 'Copia'}
            </button>
          </div>

          <h3 className="portfolio-totp__step-title">2. Verifica il codice</h3>
          <p className="portfolio-auth__hint">
            Inserisci il codice a 6 cifre mostrato dall&apos;app per confermare la configurazione.
          </p>
          <label className="portfolio-field">
            <span>Codice di verifica</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={8}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ''))}
              placeholder="000000"
            />
          </label>

          <div className="portfolio-auth__actions">
            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              {loading ? 'Verifica…' : 'Attiva 2FA'}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--block"
              disabled={loading}
              onClick={startSetup}
            >
              Rigenera QR
            </button>
          </div>
        </form>
      ) : (
        <div className="portfolio-totp__start">
          <p className="portfolio-auth__hint">
            Dopo l&apos;attivazione, ad ogni accesso con email e password ti verrà chiesto un
            codice monouso dall&apos;app autenticatore.
          </p>
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={loading}
            onClick={startSetup}
          >
            {loading ? 'Preparazione…' : 'Configura 2FA'}
          </button>
        </div>
      )}
    </section>
  );
}
