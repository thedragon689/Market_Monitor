export default function BottomNavIcon({ id, active }) {
  const stroke = active ? 2.25 : 1.75;
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (id) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6 9.5V20h12V9.5" />
        </svg>
      );
    case 'markets':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 14h4" />
        </svg>
      );
    case 'favorites':
      return (
        <svg {...common}>
          <path d="M12 20.5s-7-4.6-7-10a4 4 0 0 1 7-2.5 4 4 0 0 1 7 2.5c0 5.4-7 10-7 10z" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6" />
          <path d="M12 7h.01" strokeWidth={stroke + 0.5} />
        </svg>
      );
    case 'explore':
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M21 21l-4.2-4.2" />
        </svg>
      );
    case 'analysis':
      return (
        <svg {...common}>
          <path d="M4 19V11" />
          <path d="M9 19V6" />
          <path d="M14 19v-7" />
          <path d="M19 19V4" />
        </svg>
      );
    case 'advice':
      return (
        <svg {...common}>
          <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6" />
          <path d="M12 22v-4" />
          <path d="M8 22h8" />
          <path d="M9 14h6" />
        </svg>
      );
    case 'forecast':
      return (
        <svg {...common}>
          <path d="M3 17l5.5-5.5L12 15l8.5-10" />
          <path d="M14 5h7v7" />
        </svg>
      );
    default:
      return null;
  }
}
