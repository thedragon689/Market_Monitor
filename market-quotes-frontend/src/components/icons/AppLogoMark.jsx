/** Logo SVG scalabile — tema chiaro/scuro, desktop e mobile */
export default function AppLogoMark({
  size = 56,
  theme = 'dark',
  className = '',
  title = 'Market Monitor',
}) {
  const light = theme === 'light';
  const uid = `logo-${light ? 'l' : 'd'}-${size}`;

  return (
    <svg
      className={`app-logo-mark ${light ? 'app-logo-mark--light' : 'app-logo-mark--dark'} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="72" y1="56" x2="440" y2="456">
          <stop offset="0" stopColor={light ? '#818cf8' : '#6366f1'} />
          <stop offset="1" stopColor={light ? '#14b8a6' : '#0d9488'} />
        </linearGradient>
      </defs>
      <rect
        width="512"
        height="512"
        rx="112"
        fill={`url(#${uid}-bg)`}
      />
      <path
        d="M96 340 L176 260 L256 300 L336 180 L416 240"
        fill="none"
        stroke="#fff"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <rect x="108" y="300" width="56" height="112" rx="14" fill="#fff" opacity="0.82" />
      <rect x="196" y="260" width="56" height="152" rx="14" fill="#fff" opacity="0.92" />
      <rect x="284" y="220" width="56" height="192" rx="14" fill="#fff" />
      <circle cx="416" cy="240" r="20" fill="#fff" />
    </svg>
  );
}
