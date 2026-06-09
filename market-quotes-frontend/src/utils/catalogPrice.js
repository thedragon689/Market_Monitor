import { formatPercent, formatPrice } from './format';
import { buildDisplayPricing, formatPerGram } from './pricing';

/** Etichetta unità per prezzo attuale di mercato. */
export function priceUnitLabel(meta) {
  if (meta.pricingKind === 'perShare') return '/ azione';
  if (meta.pricingKind === 'perCoin') return '/ coin';
  if (meta.pricingKind === 'perGramTroy' || meta.pricingKind === 'perGramLb') return '/ g';
  if (meta.pricingKind === 'perBarrel') return '/ barile';
  return '';
}

export function formatCurrentPrice(quote, meta, fx) {
  if (!quote?.price) return { primary: '—', secondary: null, unit: '' };
  const display = buildDisplayPricing(meta, quote, fx);
  const unit = priceUnitLabel(meta);

  if (display.kind === 'perGramTroy' || display.kind === 'perGramLb') {
    return {
      primary: display.primaryEur != null ? formatPerGram(display.primaryEur, 'EUR') : '—',
      secondary:
        display.primaryUsd != null ? formatPerGram(display.primaryUsd, 'USD') : null,
      unit: unit.trim(),
    };
  }

  if (display.kind === 'perBarrel') {
    return {
      primary: display.primaryEur != null ? formatPrice(display.primaryEur, 'EUR') : '—',
      secondary: display.primaryUsd != null ? formatPrice(display.primaryUsd, 'USD') : null,
      unit,
    };
  }

  return {
    primary: display.primaryEur != null ? formatPrice(display.primaryEur, 'EUR') : formatPrice(display.primaryUsd, 'USD'),
    secondary:
      display.primaryEur != null && display.primaryUsd != null
        ? formatPrice(display.primaryUsd, 'USD')
        : null,
    unit,
  };
}

export function changeTone(changePercent) {
  const pct = changePercent != null ? Number(changePercent) : null;
  if (pct == null || !Number.isFinite(pct)) return 'neutral';
  if (pct > 0) return 'up';
  if (pct < 0) return 'down';
  return 'neutral';
}

export function formatChangeBadge(quote) {
  const pct = quote?.changePercent != null ? Number(quote.changePercent) : null;
  if (pct == null || !Number.isFinite(pct)) return null;
  return formatPercent(pct);
}

export function catalogToQuoteMap(catalog) {
  const map = {};
  if (!catalog) return map;
  for (const type of [
    'stock',
    'national',
    'index',
    'forex',
    'crypto',
    'precious',
    'commodity',
    'etf',
    'volatility',
    'rates',
    'macro',
    'sentiment',
  ]) {
    for (const item of catalog[type] || []) {
      if (item?.id) map[item.id.toUpperCase()] = item.quote;
    }
  }
  return map;
}
