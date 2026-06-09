/** Logo app — icona Market Monitor */
export default function AppLogo({ className = '', size = 48, title = 'Market Monitor' }) {
  return (
    <img
      className={className}
      src="/app-icon-512.png"
      width={size}
      height={size}
      alt={title}
      decoding="async"
    />
  );
}
