const svgCommon = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function SearchIcon({ size = 22, className = '' }) {
  return (
    <svg
      className={`header-icon header-icon--search ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle {...svgCommon} cx="11" cy="11" r="7" />
      <line {...svgCommon} x1="20" y1="20" x2="16" y2="16" />
    </svg>
  );
}
