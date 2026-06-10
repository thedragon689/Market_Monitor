export function formatPrice(value, currency = 'USD') {
  if (value == null || Number.isNaN(value)) return '—';
  const digits = currency === 'EUR' && Math.abs(value) >= 100 ? 0 : 2;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : undefined,
  }).format(value);
}

/** Converte un importo in USD in euro (eurUsd = quanti USD vale 1 €). */
export function usdToEur(amountUsd, eurUsd) {
  if (amountUsd == null || !Number.isFinite(amountUsd) || !eurUsd) return null;
  return amountUsd / eurUsd;
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return '—';
  const n = Number(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function changeSummary(change, changePercent) {
  const pct = Number(changePercent);
  const abs = Number(change);
  if (!Number.isFinite(pct) && !Number.isFinite(abs)) {
    return { tone: 'neutral', text: 'Variazione non disponibile' };
  }

  if (pct > 0.05 || abs > 0) {
    return {
      tone: 'up',
      text: `In rialzo${Number.isFinite(pct) ? ` del ${formatPercent(pct)}` : ''} rispetto a ieri`,
    };
  }
  if (pct < -0.05 || abs < 0) {
    return {
      tone: 'down',
      text: `In ribasso${Number.isFinite(pct) ? ` del ${formatPercent(Math.abs(pct))}` : ''} rispetto a ieri`,
    };
  }
  return { tone: 'neutral', text: 'Sostanzialmente stabile rispetto a ieri' };
}
