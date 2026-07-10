import { useEffect, useState } from 'react';
import {
  registerPortfolioTelegram,
  registerPortfolioWhatsApp,
  registerPortfolioSlack,
  setPortfolioEmailAlerts,
  getNotificationsConfig,
} from '../../utils/portfolioApi';
import PushSubscribeButton from './PushSubscribeButton';

export default function PortfolioNotifications({ onBack }) {
  const [telegramId, setTelegramId] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [slack, setSlack] = useState('');
  const [emailOn, setEmailOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [serverConfig, setServerConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getNotificationsConfig()
      .then((cfg) => {
        if (!cancelled && cfg) setServerConfig(cfg);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const runSave = async (fn, okMsg) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      setMessage(okMsg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveTelegram = (e) => {
    e.preventDefault();
    runSave(
      () => registerPortfolioTelegram(telegramId),
      'Telegram collegato. Riceverai alert sulle soglie impostate.'
    );
  };

  const saveWhatsApp = (e) => {
    e.preventDefault();
    runSave(
      () => registerPortfolioWhatsApp(whatsapp),
      'WhatsApp collegato. Riceverai alert sulle soglie impostate.'
    );
  };

  const saveSlack = (e) => {
    e.preventDefault();
    runSave(
      () => registerPortfolioSlack(slack),
      slack.trim()
        ? 'Slack collegato. Riceverai alert nel canale del webhook.'
        : 'Slack disattivato.'
    );
  };

  const toggleEmail = (e) => {
    const next = e.target.checked;
    setEmailOn(next);
    runSave(
      () => setPortfolioEmailAlerts(next),
      next ? 'Alert email attivati sull’indirizzo del tuo account.' : 'Alert email disattivati.'
    );
  };

  return (
    <section className="portfolio-notify app-card">
      <header className="portfolio-add__head">
        <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>
          ← Indietro
        </button>
        <h2>Notifiche</h2>
      </header>

      <p className="portfolio-notify__lead">
        Collega uno o più canali (Telegram, WhatsApp, Slack, email) per ricevere alert automatici
        quando il P/L supera le soglie guadagno/perdita (controllo ogni 5 minuti).
      </p>

      <form className="portfolio-add__form" onSubmit={saveTelegram}>
        <h3 className="portfolio-notify__channel">Telegram</h3>
        <p className="portfolio-notify__hint">
          Crea un bot con @BotFather, avvialo e invia /start. Inserisci il tuo Chat ID.
        </p>
        <label className="portfolio-field">
          <span>Chat ID Telegram</span>
          <input
            type="text"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder="es. 123456789"
          />
        </label>
        <button type="submit" className="btn btn--primary btn--block" disabled={loading || !telegramId}>
          Salva Telegram
        </button>
      </form>

      <form className="portfolio-add__form portfolio-notify__form-wa" onSubmit={saveWhatsApp}>
        <h3 className="portfolio-notify__channel">WhatsApp</h3>
        <p className="portfolio-notify__hint">
          Numero internazionale con prefisso (es. +39…). Richiede Twilio o Meta Cloud API sul server.
        </p>
        <label className="portfolio-field">
          <span>Numero WhatsApp</span>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="es. +393331234567"
          />
        </label>
        <button type="submit" className="btn btn--cta btn--block" disabled={loading || !whatsapp}>
          Salva WhatsApp
        </button>
      </form>

      <form className="portfolio-add__form portfolio-notify__form-slack" onSubmit={saveSlack}>
        <h3 className="portfolio-notify__channel">Slack</h3>
        <p className="portfolio-notify__hint">
          Crea un <strong>Incoming Webhook</strong> in Slack e incolla l’URL. Lascia vuoto e salva
          per disattivare.
        </p>
        <label className="portfolio-field">
          <span>Webhook URL Slack</span>
          <input
            type="url"
            value={slack}
            onChange={(e) => setSlack(e.target.value)}
            placeholder="https://hooks.slack.com/services/…"
          />
        </label>
        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          Salva Slack
        </button>
      </form>

      <div className="portfolio-add__form portfolio-notify__form-email">
        <h3 className="portfolio-notify__channel">Email</h3>
        <p className="portfolio-notify__hint">
          Ricevi gli alert sull’indirizzo del tuo account.
          {serverConfig && !serverConfig.email && (
            <>
              {' '}
              <strong>Richiede la configurazione di un provider email sul server</strong> (Resend o
              Brevo).
            </>
          )}
        </p>
        <label className="portfolio-field portfolio-field--check">
          <input
            type="checkbox"
            checked={emailOn}
            onChange={toggleEmail}
            disabled={loading || (serverConfig && !serverConfig.email)}
          />
          <span>Attiva alert via email</span>
        </label>
      </div>

      <div className="portfolio-add__form portfolio-notify__form-push">
        <h3 className="portfolio-notify__channel">Push PWA</h3>
        <p className="portfolio-notify__hint">
          Ricevi alert sul dispositivo anche con l&apos;app chiusa (Chrome, Edge, Firefox, Safari
          16.4+ su iOS se aggiunta alla Home).
          {serverConfig && !serverConfig.webpush && (
            <>
              {' '}
              <strong>Richiede VAPID keys sul server</strong> (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).
            </>
          )}
        </p>
        <PushSubscribeButton />
      </div>

      {message && <p className="portfolio-notify__ok">{message}</p>}
      {error && (
        <p className="portfolio-auth__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
