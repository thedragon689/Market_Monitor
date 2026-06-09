import { formatPerGram, toChartDisplayValue } from './pricing';

export function toDisplayPrice(usd, fx, meta) {
  if (usd == null || !Number.isFinite(usd)) return null;
  if (!fx?.eurUsd || !meta) return usd;
  return toChartDisplayValue(usd, fx, meta);
}

export function chartYDomain(values, paddingRatio = 0.1) {
  const nums = values.filter((v) => v != null && Number.isFinite(v));
  if (!nums.length) return [0, 1];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min;
  const padding = span * paddingRatio || Math.max(Math.abs(max) * 0.02, 0.01);
  return [min - padding, max + padding];
}

export function formatChartYTick(value, fx, meta) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (!fx?.eurUsd) return `$${value.toFixed(0)}`;

  const kind = meta?.pricingKind;
  if (kind === 'perGramTroy' || kind === 'perGramLb') {
    return formatPerGram(value, 'EUR');
  }
  if (kind === 'perShare') {
    return `€${value.toFixed(0)}`;
  }
  return `€${value.toFixed(0)}`;
}

export function chartAxisHint(fx, meta) {
  if (!fx?.eurUsd) return 'Asse in USD';
  const kind = meta?.pricingKind;
  if (kind === 'perGramTroy' || kind === 'perGramLb') return 'Asse in €/g';
  if (kind === 'perShare') return 'Asse in € per azione';
  return 'Asse in euro';
}
