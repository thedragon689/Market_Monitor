import { useEffect, useState } from 'react';
import {
  registerPortfolioTelegram,
  registerPortfolioWhatsApp,
  registerPortfolioSlack,
  setPortfolioEmailAlerts,
  getNotificationsConfig,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../utils/portfolioApi';
import PushSubscribeButton from './PushSubscribeButton';

export default function PortfolioNotifications({ onBack }) {
  const [telegramId, setTelegramId] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [slack, setSlack] = useState('');
  const [emailOn, setEmailOn] = useState(false);
  const [prefs, setPrefs] = useState({
    pushAlerts: true,
    notifyGain: true,
    notifyLoss: true,
    notifyForecast: true,
    notifyAdvice: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [serverConfig, setServerConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getNotificationsConfig(), getNotificationPreferences()])
      .then(([cfg, userPrefs]) => {
        if (cancelled) return;
        if (cfg) setServerConfig(cfg);
        if (userPrefs) {
          setPrefs({
            pushAlerts: userPrefs.pushAlerts !== false,
            notifyGain: userPrefs.notifyGain !== false,
            notifyLoss: userPrefs.notifyLoss !== false,
            notifyForecast: userPrefs.notifyForecast !== false,
            notifyAdvice: userPrefs.notifyAdvice !== false,
          });
          if (userPrefs.whatsappNumber) setWhatsapp(userPrefs.whatsappNumber);
          else if (userPrefs.phoneNumber) setWhatsapp(userPrefs.phoneNumber);
          if (userPrefs.telegramChatId) setTelegramId(userPrefs.telegramChatId);
          if (userPrefs.slackWebhookUrl) setSlack(userPrefs.slackWebhookUrl);
          setEmailOn(userPrefs.emailAlerts === true);
        }
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

  const togglePref = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    runSave(
      () => updateNotificationPreferences(next),
      'Preferenze alert aggiornate.'
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
        Ricevi alert automatici sul portafoglio: aumenti, diminuzioni, previsioni di trend e
        consigli operativi (controllo ogni 5 minuti).
      </p>

      <div className="portfolio-add__form portfolio-notify__form-prefs">
        <h3 className="portfolio-notify__channel">Tipi di alert</h3>
        <p className="portfolio-notify__hint">
          Scegli quali eventi inviare sui canali collegati (push, WhatsApp, Telegram, ecc.).
        </p>
        <label className="portfolio-field portfolio-field--check">
          <input
            type="checkbox"
            checked={prefs.notifyGain}
            onChange={() => togglePref('notifyGain')}
            disabled={loading}
          />
          <span>Aumenti / soglie guadagno</span>
        </label>
        <label className="portfolio-field portfolio-field--check">
          <input
            type="checkbox"
            checked={prefs.notifyLoss}
            onChange={() => togglePref('notifyLoss')}
            disabled={loading}
          />
          <span>Diminuzioni / soglie perdita</span>
        </label>
        <label className="portfolio-field portfolio-field--check">
          <input
            type="checkbox"
            checked={prefs.notifyForecast}
            onChange={() => togglePref('notifyForecast')}
            disabled={loading}
          />
          <span>Previsioni di trend</span>
        </label>
        <label className="portfolio-field portfolio-field--check">
          <input
            type="checkbox"
            checked={prefs.notifyAdvice}
            onChange={() => togglePref('notifyAdvice')}
            disabled={loading}
          />
          <span>Consigli vendita / riduzione</span>
        </label>
        <label className="portfolio-field portfolio-field--check">
          <input
            type="checkbox"
            checked={prefs.pushAlerts}
            onChange={() => togglePref('pushAlerts')}
            disabled={loading}
          />
          <span>Invia notifiche push sull&apos;app</span>
        </label>
      </div>

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
