import ActivateTelegramButton from './ActivateTelegramButton';
import ActivateWhatsAppButton from './ActivateWhatsAppButton';

export default function PostRegisterTelegramPrompt({ onContinue }) {
  return (
    <section className="portfolio-auth portfolio-auth--telegram-prompt app-card">
      <header className="portfolio-auth__head">
        <h2 className="portfolio-auth__title">Account creato</h2>
        <p className="portfolio-auth__lead">
          Collega i canali per ricevere gli alert del portafoglio (aumenti, diminuzioni, soglie P/L).
        </p>
      </header>

      <div className="portfolio-auth__telegram-block">
        <h3 className="portfolio-notify__channel">Telegram</h3>
        <ActivateTelegramButton label="Attiva notifiche Telegram" onOpened={() => {}} />
      </div>

      <div className="portfolio-auth__telegram-block">
        <h3 className="portfolio-notify__channel">WhatsApp</h3>
        <p className="portfolio-notify__hint">
          Inserisci il numero in formato internazionale (+39…) oppure apri la chat con il messaggio
          precompilato <strong>/start</strong>.
        </p>
        <ActivateWhatsAppButton label="Attiva notifiche WhatsApp" />
      </div>

      <p className="portfolio-notify__hint portfolio-notify__hint--sub">
        Puoi configurare Telegram e WhatsApp anche in seguito dalla sezione Notifiche.
      </p>

      <div className="portfolio-auth__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={onContinue}>
          Continua al portfolio
        </button>
      </div>
    </section>
  );
}
