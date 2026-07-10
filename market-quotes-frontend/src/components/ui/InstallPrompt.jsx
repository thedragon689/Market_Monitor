import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/** Prompt "Aggiungi a schermata Home" mostrato dopo alcune visite. */
export default function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <div className="ui-install-prompt ui-card--glass" role="dialog" aria-label="Installa app">
      <div className="ui-install-prompt__text">
        <strong>Installa Market Monitor</strong>
        <span>Accesso rapido e uso offline dalla schermata Home.</span>
      </div>
      <div className="ui-install-prompt__actions">
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={dismiss}>
          Più tardi
        </button>
        <button
          type="button"
          className="ui-btn ui-btn--primary ui-btn--sm"
          onClick={promptInstall}
        >
          Installa
        </button>
      </div>
    </div>
  );
}
