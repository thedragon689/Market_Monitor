import { categoriesByGroup } from '../data/categories';

const STATIC = [
  { id: 'home', label: 'Home', view: 'explore' },
  { id: 'forecast', label: 'Previsioni', view: 'forecast' },
  { id: 'info', label: 'Info', action: 'info' },
];

const PRIMARY_TYPES = categoriesByGroup('primary').map((c) => ({
  id: c.id,
  label: c.label,
  view: 'explore',
  type: c.id,
}));

const ITEMS = [...STATIC.slice(0, 1), ...PRIMARY_TYPES.slice(0, 5), ...STATIC.slice(1)];

export default function QuickNav({ view, type, onNavigate, onInfo }) {
  const isActive = (item) => {
    if (item.action === 'info') return false;
    if (item.id === 'home') return view === 'explore';
    if (item.type) return view === 'explore' && type === item.type;
    if (item.view === 'forecast') return view === 'forecast';
    return false;
  };

  return (
    <nav className="quick-nav" aria-label="Navigazione rapida mercati">
      <ul className="quick-nav__list">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`quick-nav__btn ${isActive(item) ? 'is-active' : ''}`}
              onClick={() => {
                if (item.action === 'info') {
                  onInfo?.();
                  return;
                }
                onNavigate?.({ view: item.view, type: item.type });
              }}
              aria-current={isActive(item) ? 'page' : undefined}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
