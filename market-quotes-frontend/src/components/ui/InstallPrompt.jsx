import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/** Prompt installazione PWA — Android (nativo) o iOS (guida manuale). */
export default function InstallPrompt() {
  const { canInstall, iosGuide, hasNativePrompt, promptInstall, dismiss, isStandalone } =
    useInstallPrompt();

  if (isStandalone || !canInstall) return null;

  return (
    <div className="ui-install-prompt ui-card--glass" role="dialog" aria-label="Installa app">
      <div className="ui-install-prompt__text">
        <strong>Installa Market Monitor</strong>
        {iosGuide ? (
          <span>
            Su iPhone/iPad: tocca <strong>Condividi</strong> (□↑) in Safari, poi{' '}
            <strong>Aggiungi a Home</strong>.
          </span>
        ) : (
          <span>Accesso rapido, portfolio e notifiche dalla schermata Home.</span>
        )}
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
