/** Icone categoria — stroke uniforme, desktop + mobile */
const STROKE = 1.75;

function Svg({ size = 20, children, className = '' }) {
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const ICONS = {
  stock: (
    <>
      <path d="M4 19V11" />
      <path d="M9 19V6" />
      <path d="M14 19v-7" />
      <path d="M19 19V4" />
    </>
  ),
  national: (
    <>
      <path d="M3 21h18" />
      <path d="M6 21V9l6-4 6 4v12" />
      <path d="M9 21v-5h6v5" />
    </>
  ),
  index: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </>
  ),
  forex: (
    <>
      <path d="M7 8h6a2 2 0 1 1 0 4H9a2 2 0 0 0 0 4h6" />
      <path d="M7 16l-2 2 2 2" />
      <path d="M17 8l2-2-2-2" />
    </>
  ),
  commodity: (
    <>
      <path d="M12 3v3" />
      <path d="M8 6h8l-1.2 13H9.2L8 6z" />
      <path d="M9 11h6" />
    </>
  ),
  precious: (
    <>
      <path d="M12 3l7 7.5L12 21 5 10.5 12 3z" />
      <path d="M5 10.5h14" />
    </>
  ),
  etf: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  crypto: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 8h3.5a2.5 2.5 0 0 1 0 5H9v-5z" />
      <path d="M9 13h4a2.5 2.5 0 0 1 0 5H9v-5z" />
      <path d="M10 7v10" />
    </>
  ),
  volatility: (
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
  ),
  rates: (
    <>
      <path d="M5 20V10" />
      <path d="M12 20V5" />
      <path d="M19 20v-8" />
      <path d="M3 20h18" />
    </>
  ),
  macro: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9" />
      <path d="M12 3c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9" />
    </>
  ),
  sentiment: (
    <>
      <path d="M12 14V9" />
      <path d="M12 14l2.5-2.5" />
      <path d="M4.5 16.5a8 8 0 1 1 15 0" />
    </>
  ),
  internal: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </>
  ),
  technical: (
    <>
      <path d="M4 19V11" />
      <path d="M9 19V6" />
      <path d="M14 19v-7" />
      <path d="M19 19V4" />
      <path d="M3 19h18" />
    </>
  ),
  forecasts: (
    <>
      <path d="M3 17l5-5 4 4 7-9" />
      <path d="M14 7h7v7" />
      <path d="M3 21h18" />
    </>
  ),
  correlations: (
    <>
      <path d="M8 12h8" />
      <path d="M12 8v8" />
      <circle cx="7" cy="12" r="2.5" />
      <circle cx="17" cy="12" r="2.5" />
    </>
  ),
  news: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
      <path d="M8 17h8" />
    </>
  ),
  indices: null,
  sectors: null,
  rates_panel: null,
  global: null,
  commodities: null,
  precious_panel: null,
};

/** Alias pannelli terminal → categoria */
const ALIASES = {
  indices: 'index',
  sectors: 'etf',
  rates: 'rates',
  rates_panel: 'rates',
  global: 'index',
  commodities: 'commodity',
  precious: 'precious',
  precious_panel: 'precious',
  forex: 'forex',
  crypto: 'crypto',
};

export default function CategoryIcon({ id, size = 20, className = '' }) {
  const key = ALIASES[id] || id;
  const paths = ICONS[key] || ICONS.internal;
  return (
    <Svg size={size} className={className}>
      {paths}
    </Svg>
  );
}
