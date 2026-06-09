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
