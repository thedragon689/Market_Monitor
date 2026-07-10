import AppLogoMark from './icons/AppLogoMark';

/** Logo app — SVG scalabile, tema chiaro */
export default function AppLogo({
  className = '',
  size = 56,
  title = 'Market Monitor',
}) {
  return (
    <AppLogoMark
      className={`app-logo app-logo--light ${className}`.trim()}
      size={size}
      title={title}
    />
  );
}
