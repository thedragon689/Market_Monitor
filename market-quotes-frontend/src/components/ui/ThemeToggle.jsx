import { useTheme } from '../../theme/ThemeProvider';

/** Toggle dark/light con persistenza (gestita dal ThemeProvider). */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className={`ui-theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      title={isDark ? 'Tema chiaro' : 'Tema scuro'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
