/**
 * Bottom navigation mobile a 5 tab.
 * Componente controllato: `active` è l'id del tab, `onChange(id)` al tap.
 */
export const DEFAULT_TABS = [
  { id: 'markets', label: 'Mercati', icon: '📊' },
  { id: 'analysis', label: 'Analisi', icon: '📈' },
  { id: 'portfolio', label: 'Portfolio', icon: '💼' },
  { id: 'alerts', label: 'Alert', icon: '🔔' },
  { id: 'profile', label: 'Profilo', icon: '👤' },
];

export default function BottomNav({
  tabs = DEFAULT_TABS,
  active,
  onChange,
  className = '',
}) {
  return (
    <nav
      className={`ui-bottom-nav ${className}`.trim()}
      aria-label="Navigazione principale"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            className={`ui-bottom-nav__tab ${isActive ? 'is-active' : ''}`.trim()}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onChange?.(tab.id)}
          >
            <span className="ui-bottom-nav__icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="ui-bottom-nav__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
