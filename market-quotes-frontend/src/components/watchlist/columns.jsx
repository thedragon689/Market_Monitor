import Sparkline from '../Sparkline';

/* ── Helper indicatori (client-side, da history disponibile) ────────── */
function pricesOf(row) {
  return (row.history ?? [])
    .map((p) => (typeof p === 'number' ? p : p?.price))
    .filter((v) => Number.isFinite(Number(v)))
    .map(Number);
}

function sma(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsi(prices, period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i += 1) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function fmtPrice(v, currency) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '';
  return `${sym}${Number(v).toLocaleString('it-IT', { maximumFractionDigits: 2 })}`;
}

function fmtPct(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function toneClass(v) {
  if (v == null || !Number.isFinite(Number(v))) return '';
  return Number(v) >= 0 ? 'wl-up' : 'wl-down';
}

/**
 * Definizione colonne. Ogni colonna: id, label, width (px), align,
 * render(row) → nodo, sortValue(row) → number|string per l'ordinamento.
 */
export const COLUMNS = [
  {
    id: 'symbol',
    label: 'Simbolo',
    width: 110,
    align: 'left',
    fixed: true,
    render: (row) => <span className="wl-symbol">{row.symbol}</span>,
    sortValue: (row) => row.symbol,
  },
  {
    id: 'name',
    label: 'Nome',
    width: 150,
    align: 'left',
    render: (row) => <span className="wl-name">{row.name || '—'}</span>,
    sortValue: (row) => row.name || '',
  },
  {
    id: 'price',
    label: 'Prezzo',
    width: 110,
    align: 'right',
    render: (row) => fmtPrice(row.quote?.price, row.quote?.currency),
    sortValue: (row) => Number(row.quote?.price) || -Infinity,
  },
  {
    id: 'changePercent',
    label: 'Var %',
    width: 90,
    align: 'right',
    render: (row) => (
      <span className={toneClass(row.quote?.changePercent)}>
        {fmtPct(row.quote?.changePercent)}
      </span>
    ),
    sortValue: (row) => Number(row.quote?.changePercent) ?? -Infinity,
  },
  {
    id: 'change',
    label: 'Var',
    width: 90,
    align: 'right',
    render: (row) => (
      <span className={toneClass(row.quote?.change)}>
        {row.quote?.change != null ? Number(row.quote.change).toFixed(2) : '—'}
      </span>
    ),
    sortValue: (row) => Number(row.quote?.change) ?? -Infinity,
  },
  {
    id: 'sma20',
    label: 'SMA20',
    width: 90,
    align: 'right',
    render: (row) => {
      const v = sma(pricesOf(row), 20);
      return v == null ? '—' : fmtPrice(v, row.quote?.currency);
    },
    sortValue: (row) => sma(pricesOf(row), 20) ?? -Infinity,
  },
  {
    id: 'rsi',
    label: 'RSI',
    width: 70,
    align: 'right',
    render: (row) => {
      const v = rsi(pricesOf(row));
      if (v == null) return '—';
      const cls = v >= 70 ? 'wl-down' : v <= 30 ? 'wl-up' : '';
      return <span className={cls}>{v.toFixed(0)}</span>;
    },
    sortValue: (row) => rsi(pricesOf(row)) ?? -Infinity,
  },
  {
    id: 'spark',
    label: 'Trend 30g',
    width: 90,
    align: 'center',
    render: (row) => <Sparkline points={row.history ?? []} width={72} height={24} />,
    sortValue: () => 0,
  },
];

export const DEFAULT_VISIBLE = COLUMNS.map((c) => c.id);
