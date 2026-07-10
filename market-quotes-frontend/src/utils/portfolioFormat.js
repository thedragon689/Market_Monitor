import { formatPercent, formatPrice } from './format';

export function toneFromPct(pct) {
  if (pct == null || !Number.isFinite(pct)) return 'neutral';
  if (pct > 0) return 'up';
  if (pct < 0) return 'down';
  return 'neutral';
}

export function fmtMoney(value, currency = 'EUR') {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatPrice(value, currency);
}

export function fmtPercent(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatPercent(value);
}

/** Valida quantità/prezzo positivi lato client. */
export function parsePositiveInput(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${label} deve essere un numero positivo`);
  }
  return n;
}
