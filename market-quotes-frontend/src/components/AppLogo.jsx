/** Logo app — SVG scalabile, visibile in header e dark mode */
export default function AppLogo({ className = '', size = 48, title = 'Market Monitor' }) {
  const id = `mm-logo-${size}`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={`${id}-bg`} x1="6" y1="5" x2="42" y2="43" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="11" fill={`url(#${id}-bg)`} />
      <path
        d="M9 32 L15 26 L21 29 L27 19 L33 22"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="10.5" y="28" width="5" height="10" rx="1.2" fill="#fff" opacity="0.88" />
      <rect x="18.5" y="24" width="5" height="14" rx="1.2" fill="#fff" opacity="0.95" />
      <rect x="26.5" y="20" width="5" height="18" rx="1.2" fill="#fff" />
      <circle cx="33" cy="22" r="2" fill="#fff" />
    </svg>
  );
}
