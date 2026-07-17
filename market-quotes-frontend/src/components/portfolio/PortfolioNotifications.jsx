import { useCallback, useEffect, useState } from 'react';
import {
  registerPortfolioTelegram,
  registerPortfolioWhatsApp,
  registerPortfolioSlack,
  setPortfolioEmailAlerts,
  getNotificationsConfig,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationFeed,
  markNotificationsRead,
} from '../../utils/portfolioApi';
import PushSubscribeButton from './PushSubscribeButton';
import ActivateTelegramButton from './ActivateTelegramButton';
import ActivateWhatsAppButton from './ActivateWhatsAppButton';

const SORT_OPTIONS = [
  { value: 'importance_desc', label: 'Importanza ↓' },
  { value: 'importance_asc', label: 'Importanza ↑' },
  { value: 'time_desc', label: 'Più recenti' },
  { value: 'time_asc', label: 'Più vecchie' },
];

function formatWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function kindLabel(kind) {
  switch (kind) {
    case 'increase':
      return 'Aumento';
    case 'decrease':
      return 'Diminuzione';
    case 'gain':
      return 'Guadagno';
    case 'loss':
      return 'Perdita';
    case 'forecast':
      return 'Previsione';
    case 'advice':
      return 'Consiglio';
    case 'insert':
      return 'Inserimento';
    case 'register':
      return 'Registrazione';
    default:
      return kind || 'Evento';
  }
}

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

  const [sort, setSort] = useState('importance_desc');
  const [feed, setFeed] = useState([]);
  const [insights, setInsights] = useState(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);

  const loadFeed = useCallback(async (nextSort = sort) => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await getNotificationFeed({ sort: nextSort, limit: 40 });
      setFeed(Array.isArray(data?.items) ? data.items : []);
      setInsights(data?.insights ?? null);
    } catch (err) {
      setFeedError(err.message || 'Impossibile caricare le notifiche');
    } finally {
      setFeedLoading(false);
    }
  }, [sort]);

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

  useEffect(() => {
    loadFeed(sort);
  }, [sort, loadFeed]);

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

  const markAllRead = () => {
    runSave(async () => {
      await markNotificationsRead();
      await loadFeed(sort);
    }, 'Notifiche segnate come lette.');
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
        Il database rileva aumenti e diminuzioni del portafoglio, li ordina per importanza e
        conserva data/ora di registrazione, inserimenti e variazioni. Qui vedi i valori dalle
        query (aggiornamento ogni 5 minuti dal monitor).
      </p>

      <div className="portfolio-notify__feed">
        <div className="portfolio-notify__feed-head">
          <h3 className="portfolio-notify__channel">
            Eventi
            {insights?.unreadCount > 0 ? (
              <span className="portfolio-notify__badge">{insights.unreadCount}</span>
            ) : null}
          </h3>
          <div className="portfolio-notify__feed-actions">
            <label className="portfolio-notify__sort">
              <span className="visually-hidden">Ordina</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                disabled={feedLoading}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => loadFeed(sort)}
              disabled={feedLoading}
            >
              Aggiorna
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={markAllRead}
              disabled={loading || !insights?.unreadCount}
            >
              Segna lette
            </button>
          </div>
        </div>

        {(insights?.topIncreases?.length > 0 || insights?.topDecreases?.length > 0) && (
          <div className="portfolio-notify__insights">
            {insights.topIncreases?.length > 0 && (
              <div className="portfolio-notify__insight portfolio-notify__insight--up">
                <strong>Top aumenti</strong>
                <ul>
                  {insights.topIncreases.slice(0, 3).map((v) => (
                    <li key={v.id}>
                      {v.symbol || 'Portafoglio'}{' '}
                      <span>
                        {v.deltaPercent != null
                          ? `+${Number(v.deltaPercent).toFixed(2)}%`
                          : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.topDecreases?.length > 0 && (
              <div className="portfolio-notify__insight portfolio-notify__insight--down">
                <strong>Top diminuzioni</strong>
                <ul>
                  {insights.topDecreases.slice(0, 3).map((v) => (
                    <li key={v.id}>
                      {v.symbol || 'Portafoglio'}{' '}
                      <span>
                        {v.deltaPercent != null
                          ? `${Number(v.deltaPercent).toFixed(2)}%`
                          : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {feedLoading && <p className="portfolio-notify__hint">Caricamento eventi…</p>}
        {feedError && (
          <p className="portfolio-auth__error" role="alert">
            {feedError}
          </p>
        )}
        {!feedLoading && !feedError && feed.length === 0 && (
          <p className="portfolio-notify__hint">
            Nessun evento ancora. Aggiungi asset o attendi il prossimo ciclo del monitor.
          </p>
        )}
        {!feedLoading && feed.length > 0 && (
          <ul className="portfolio-notify__list">
            {feed.map((item) => (
              <li
                key={item.id}
                className={`portfolio-notify__item${item.readAt ? '' : ' portfolio-notify__item--unread'}${
                  item.direction === 'increase'
                    ? ' portfolio-notify__item--up'
                    : item.direction === 'decrease'
                      ? ' portfolio-notify__item--down'
                      : ''
                }`}
              >
                <div className="portfolio-notify__item-meta">
                  <span className="portfolio-notify__kind">{kindLabel(item.kind)}</span>
                  <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                </div>
                <strong className="portfolio-notify__item-title">{item.title}</strong>
                {item.body && <p className="portfolio-notify__item-body">{item.body}</p>}
                <div className="portfolio-notify__item-foot">
                  {item.symbol && <span>{item.symbol}</span>}
                  <span title="Importanza ( |Δ%| )">
                    Imp. {Number(item.importance ?? 0).toFixed(2)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
          Crea un bot con @BotFather. Poi collega automaticamente oppure inserisci manualmente il Chat ID.
          {serverConfig?.telegramBotUsername && (
            <>
              {' '}
              Bot: <strong>@{serverConfig.telegramBotUsername}</strong>
            </>
          )}
        </p>
        <ActivateTelegramButton
          label="Attiva notifiche Telegram"
          className="btn btn--cta btn--block portfolio-notify__tg-link"
          disabled={loading}
        />
        <p className="portfolio-notify__hint portfolio-notify__hint--sub">
          Oppure scrivi /start al bot per ottenere il Chat ID e incollalo qui sotto.
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
        <ActivateWhatsAppButton
          label="Attiva notifiche WhatsApp"
          defaultPhone={whatsapp}
          onSaved={(result) => {
            const saved = result?.whatsapp || result?.whatsapp_number;
            if (saved) setWhatsapp(saved);
            setMessage('WhatsApp collegato. Riceverai alert sulle soglie impostate.');
          }}
        />
        <label className="portfolio-field">
          <span>Numero WhatsApp (manuale)</span>
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
