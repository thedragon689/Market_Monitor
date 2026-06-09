import AppLogoMark from './icons/AppLogoMark';

/** Logo app — SVG scalabile, tema chiaro / scuro */
export default function AppLogo({
  className = '',
  size = 56,
  theme = 'dark',
  title = 'Market Monitor',
}) {
  return (
    <AppLogoMark
      className={`app-logo ${theme === 'light' ? 'app-logo--light' : 'app-logo--dark'} ${className}`.trim()}
      size={size}
      theme={theme}
      title={title}
    />
  );
}
