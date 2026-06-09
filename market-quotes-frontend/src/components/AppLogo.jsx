/** Logo app — varianti tema chiaro / scuro per massima leggibilità */
export default function AppLogo({
  className = '',
  size = 56,
  theme = 'dark',
  title = 'Market Monitor',
}) {
  const isLight = theme === 'light';
  const src = isLight ? '/app-icon-light-512.png' : '/app-icon-dark-512.png';

  return (
    <img
      className={`app-logo ${isLight ? 'app-logo--light' : 'app-logo--dark'} ${className}`.trim()}
      src={src}
      width={size}
      height={size}
      alt={title}
      decoding="async"
    />
  );
}
