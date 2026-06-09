export default function TerminalWidget({ title, children, actions, className = '', panelId }) {
  return (
    <section
      id={panelId ? `terminal-panel-${panelId}` : undefined}
      className={`terminal-widget ${className}`.trim()}
    >
      <header className="terminal-widget__head">
        <h3 className="terminal-widget__title">{title}</h3>
        {actions && <div className="terminal-widget__actions">{actions}</div>}
      </header>
      <div className="terminal-widget__body">{children}</div>
    </section>
  );
}
