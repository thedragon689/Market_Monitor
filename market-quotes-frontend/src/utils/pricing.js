import { formatPrice, usdToEur } from './format';

/** Grammi in un'oncia troy (oro/argento spot). */
export const TROY_OZ_GRAMS = 31.1034768;

/** Grammi in una libbra (rame COMEX). */
export const LB_GRAMS = 453.59237;

export function spotOzToGramPrice(pricePerOz) {
  if (pricePerOz == null || !Number.isFinite(pricePerOz)) return null;
  return pricePerOz / TROY_OZ_GRAMS;
}

export function spotLbToGramPrice(pricePerLb) {
  if (pricePerLb == null || !Number.isFinite(pricePerLb)) return null;
  return pricePerLb / LB_GRAMS;
}

export function formatPerGram(value, currency = 'EUR') {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

export function buildDisplayPricing(meta, quote, fx) {
  const eurUsd = fx?.eurUsd;
  const quoteCcy = (quote?.currency || 'USD').toUpperCase();
  const nativeEur = quoteCcy === 'EUR' ? quote?.price : null;
  const nativeUsd = quoteCcy === 'USD' ? quote?.price : quote?.priceUsd;
  const usd = nativeUsd ?? (nativeEur && eurUsd ? nativeEur * eurUsd : quote?.price);
  const eur = quote?.priceEur ?? nativeEur ?? usdToEur(usd, eurUsd);

  if (meta.pricingKind === 'perShare') {
    return {
      kind: 'perShare',
      primaryLabel: '1 azione',
      primaryEur: eur,
      primaryUsd: usd,
      secondaryEur: null,
      secondaryUsd: null,
      plainUnit: 'una singola azione',
    };
  }

  if (meta.pricingKind === 'perCoin') {
    return {
      kind: 'perCoin',
      primaryLabel: '1 coin',
      primaryEur: eur,
      primaryUsd: usd,
      secondaryEur: null,
      secondaryUsd: null,
      plainUnit: 'una singola coin',
    };
  }

  if (meta.pricingKind === 'perGramTroy') {
    const gramUsd = spotOzToGramPrice(usd);
    const gramEur = spotOzToGramPrice(eur);
    return {
      kind: 'perGramTroy',
      primaryLabel: 'al grammo',
      primaryEur: gramEur,
      primaryUsd: gramUsd,
      secondaryEur: eur,
      secondaryUsd: usd,
      secondaryLabel: "all'oncia troy",
      plainUnit: '1 grammo',
    };
  }

  if (meta.pricingKind === 'perGramLb') {
    const gramUsd = spotLbToGramPrice(usd);
    const gramEur = spotLbToGramPrice(eur);
    return {
      kind: 'perGramLb',
      primaryLabel: 'al grammo',
      primaryEur: gramEur,
      primaryUsd: gramUsd,
      secondaryEur: eur,
      secondaryUsd: usd,
      secondaryLabel: 'alla libbra',
      plainUnit: '1 grammo di rame',
    };
  }

  if (meta.pricingKind === 'perBarrel') {
    return {
      kind: 'perBarrel',
      primaryLabel: 'al barile',
      primaryEur: eur,
      primaryUsd: usd,
      secondaryEur: null,
      secondaryUsd: null,
      plainUnit: 'un barile (WTI)',
    };
  }

  return {
    kind: 'generic',
    primaryLabel: '',
    primaryEur: eur,
    primaryUsd: usd,
    plainUnit: meta.unit || 'unità',
  };
}

/** Valore numerico per assi grafico (EUR, eventualmente al grammo). */
export function toChartDisplayValue(usd, fx, meta) {
  if (usd == null || !Number.isFinite(usd)) return null;
  const eur = usdToEur(usd, fx?.eurUsd);
  const display = buildDisplayPricing(meta, { price: usd, priceEur: eur }, fx);
  return display.primaryEur ?? eur ?? usd;
}

/** Etichetta prezzo previsione: EUR in evidenza, USD tra parentesi. */
export function formatForecastDual(usd, fx, meta) {
  if (usd == null || !Number.isFinite(usd)) return { primary: '—', secondary: null };

  const eur = usdToEur(usd, fx?.eurUsd);
  const display = buildDisplayPricing(meta, { price: usd, priceEur: eur }, fx);

  if (display.primaryEur != null && display.primaryLabel === 'al grammo') {
    return {
      primary: `${formatPerGram(display.primaryEur, 'EUR')} /g`,
      secondary: display.primaryUsd != null ? `${formatPerGram(display.primaryUsd, 'USD')} /g` : null,
    };
  }

  if (display.kind === 'perShare' && display.primaryEur != null) {
    return {
      primary: `${formatPrice(display.primaryEur, 'EUR')} /azione`,
      secondary:
        display.primaryUsd != null ? `${formatPrice(display.primaryUsd, 'USD')} /azione` : null,
    };
  }

  if (display.kind === 'perCoin' && display.primaryEur != null) {
    return {
      primary: `${formatPrice(display.primaryEur, 'EUR')} /coin`,
      secondary:
        display.primaryUsd != null ? `${formatPrice(display.primaryUsd, 'USD')} /coin` : null,
    };
  }

  if (display.primaryEur != null) {
    return {
      primary: formatPrice(display.primaryEur, 'EUR'),
      secondary: display.primaryUsd != null ? formatPrice(display.primaryUsd, 'USD') : null,
    };
  }

  return { primary: formatPrice(usd, 'USD'), secondary: null };
}

/** Coefficienti regressione (USD) → testo EUR + USD. */
export function formatRegressionCoeff(valueUsd, fx, { unit = '', decimals = 2 } = {}) {
  if (valueUsd == null || !Number.isFinite(valueUsd)) return '—';
  const eur = usdToEur(valueUsd, fx?.eurUsd);
  const suffix = unit ? ` ${unit}` : '';
  if (eur == null) return `${valueUsd.toFixed(decimals)} USD${suffix}`;
  return `${formatPrice(eur, 'EUR')}${suffix} (${valueUsd.toFixed(decimals)} USD${suffix})`;
}

export function formatCompetitorCell(quote, meta, fx) {
  if (!quote?.price) return '—';
  const display = buildDisplayPricing(meta, quote, fx);
  if (display.kind === 'perShare') {
    return display.primaryEur != null
      ? `${formatPrice(display.primaryEur, 'EUR')} / azione`
      : `${formatPrice(display.primaryUsd, 'USD')} / azione`;
  }
  if (display.kind === 'perCoin') {
    return display.primaryEur != null
      ? `${formatPrice(display.primaryEur, 'EUR')} / coin`
      : `${formatPrice(display.primaryUsd, 'USD')} / coin`;
  }
  if (display.primaryEur != null && display.primaryLabel === 'al grammo') {
    return `${formatPerGram(display.primaryEur, 'EUR')} / g`;
  }
  return display.primaryEur != null
    ? formatPrice(display.primaryEur, 'EUR')
    : formatPrice(display.primaryUsd, 'USD');
}
