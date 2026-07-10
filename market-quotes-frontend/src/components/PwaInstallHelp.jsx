import { isIos, isStandalonePwa } from '../utils/pwaPlatform';
import { APP_VERSION } from '../config/version';

/** Istruzioni permanenti per installare/aggiornare la PWA (tab Info). */
export default function PwaInstallHelp() {
  const standalone = isStandalonePwa();
  const ios = isIos();

  return (
    <article className="info-page__card app-card info-page__card--wide">
      <h2>App mobile (PWA)</h2>
      {standalone ? (
        <p>
          Stai usando l&apos;app installata. Versione <strong>{APP_VERSION}</strong>. Se non vedi
          Portfolio/Watchlist, chiudi l&apos;app dal multitasking e riaprila, oppure in Safari
          impostazioni sito → <strong>Cancella dati sito</strong>, poi reinstalla.
        </p>
      ) : ios ? (
        <ol className="info-page__steps">
          <li>Apri questo sito in <strong>Safari</strong> (non in app Facebook/Instagram).</li>
          <li>Tocca <strong>Condividi</strong> (icona quadrato con freccia in alto).</li>
          <li>Scorri e scegli <strong>Aggiungi a Home</strong>.</li>
          <li>Conferma con <strong>Aggiungi</strong> — l&apos;icona apparirà sulla Home.</li>
        </ol>
      ) : (
        <ol className="info-page__steps">
          <li>Apri il sito in <strong>Chrome</strong> su Android.</li>
          <li>Menu ⋮ → <strong>Installa app</strong> o <strong>Aggiungi a schermata Home</strong>.</li>
          <li>In alternativa attendi il banner &quot;Installa Market Monitor&quot; in basso.</li>
        </ol>
      )}
      <p className="info-page__hint">
        Versione attuale: <strong>{APP_VERSION}</strong> · Push e offline richiedono l&apos;app
        installata.
      </p>
    </article>
  );
}
