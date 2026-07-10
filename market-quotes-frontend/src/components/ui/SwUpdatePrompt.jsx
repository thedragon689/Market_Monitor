/** Banner mobile/desktop: nuova versione PWA pronta — ricarica per applicare. */
export default function SwUpdatePrompt({ onReload, onDismiss }) {
  return (
    <div className="ui-install-prompt ui-card--glass" role="dialog" aria-label="Aggiornamento app">
      <div className="ui-install-prompt__text">
        <strong>Nuova versione disponibile</strong>
        <span>Aggiorna Market Monitor per portfolio, watchlist e notifiche push.</span>
      </div>
      <div className="ui-install-prompt__actions">
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onDismiss}>
          Più tardi
        </button>
        <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={onReload}>
          Aggiorna
        </button>
      </div>
    </div>
  );
}
