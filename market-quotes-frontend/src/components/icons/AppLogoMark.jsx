/** Logo SVG scalabile — variante chiara */
export default function AppLogoMark({
  size = 56,
  className = '',
  title = 'Market Monitor',
}) {
  const uid = `logo-l-${size}`;

  return (
    <svg
      className={`app-logo-mark app-logo-mark--light ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="72" y1="56" x2="440" y2="456">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${uid}-bg)`} />
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
