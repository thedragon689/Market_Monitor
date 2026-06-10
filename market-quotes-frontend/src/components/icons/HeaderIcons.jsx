const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function MenuIcon({ size = 22, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path {...stroke} d="M4 7h16" />
      <path {...stroke} d="M4 12h16" />
      <path {...stroke} d="M4 17h16" />
    </svg>
  );
}

export function SearchIcon({ size = 22, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle {...stroke} cx="11" cy="11" r="7" />
      <path {...stroke} d="M20 20l-4-4" />
    </svg>
  );
}
