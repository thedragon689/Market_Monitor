export default function ThemeToggle({ theme, onChange }) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => onChange(next)}
      aria-label={next === 'light' ? 'Tema chiaro' : 'Tema scuro'}
      title={next === 'light' ? 'Tema chiaro' : 'Tema scuro'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
