import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/** Prompt installazione PWA — Android (nativo) o iOS (guida manuale). */
export default function InstallPrompt() {
  const {
    canInstall,
    iosGuide,
    androidGuide,
    inAppBrowser,
    hasNativePrompt,
    promptInstall,
    dismiss,
    isStandalone,
  } = useInstallPrompt();

  if (isStandalone || !canInstall) return null;

  let hint = 'Accesso rapido, portfolio e notifiche dalla schermata Home.';
  if (inAppBrowser) {
    hint = iosGuide
      ? 'Apri questa pagina in Safari (Condividi → Apri in Safari), poi Aggiungi a Home.'
      : 'Apri in Chrome (menu ⋮ → Apri nel browser), poi Installa app o Aggiungi a schermata Home.';
  } else if (iosGuide) {
    hint = 'Su iPhone/iPad: tocca Condividi (□↑) in Safari, poi Aggiungi a Home.';
  } else if (androidGuide && !hasNativePrompt) {
    hint = 'In Chrome: menu ⋮ → Installa app o Aggiungi a schermata Home.';
  }

  return (
    <div className="ui-install-prompt ui-card--glass" role="dialog" aria-label="Installa app">
      <div className="ui-install-prompt__text">
        <strong>Installa Market Monitor</strong>
        <span>{hint}</span>
      </div>
      <div className="ui-install-prompt__actions">
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={dismiss}>
          Più tardi
        </button>
        {hasNativePrompt ? (
          <button
            type="button"
            className="ui-btn ui-btn--primary ui-btn--sm"
            onClick={promptInstall}
          >
            Installa
          </button>
        ) : null}
      </div>
    </div>
  );
}
