import { formatPrice, usdToEur } from './format';
import { quoteFromNativePrice } from './nativeCurrency';

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
      plainUnit: 'un barile',
    };
  }

  if (meta.pricingKind === 'perMmbtu') {
    return {
      kind: 'perMmbtu',
      primaryLabel: 'MMBtu',
      primaryEur: eur,
      primaryUsd: usd,
      secondaryEur: null,
      secondaryUsd: null,
      plainUnit: 'un MMBtu',
    };
  }

  if (meta.pricingKind === 'perBushel') {
    return {
      kind: 'perBushel',
      primaryLabel: 'bushel',
      primaryEur: eur,
      primaryUsd: usd,
      secondaryEur: null,
      secondaryUsd: null,
      plainUnit: 'un bushel',
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

/** Valore numerico per assi grafico (valuta nativa → EUR display). */
export function toChartDisplayValue(nativePrice, fx, meta, currency = 'USD') {
  if (nativePrice == null || !Number.isFinite(nativePrice)) return null;
  const quoteLike = quoteFromNativePrice(nativePrice, currency, fx);
  const display = buildDisplayPricing(meta, quoteLike, fx);
  return display.primaryEur ?? display.primaryUsd ?? nativePrice;
}

/** Etichetta prezzo previsione: EUR in evidenza, USD tra parentesi. */
export function formatForecastDual(nativePrice, fx, meta, currency = 'USD') {
  if (nativePrice == null || !Number.isFinite(nativePrice)) {
    return { primary: '—', secondary: null };
  }

  const quoteLike = quoteFromNativePrice(nativePrice, currency, fx);
  const display = buildDisplayPricing(meta, quoteLike, fx);

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

  const ccy = String(currency).toUpperCase();
  if (ccy === 'EUR') {
    return {
      primary: formatPrice(nativePrice, 'EUR'),
      secondary: quoteLike?.priceUsd != null ? formatPrice(quoteLike.priceUsd, 'USD') : null,
    };
  }
  return { primary: formatPrice(nativePrice, 'USD'), secondary: null };
}

/** Coefficienti regressione (valuta nativa) → testo EUR + USD. */
export function formatRegressionCoeff(valueNative, fx, { unit = '', decimals = 2, currency = 'USD' } = {}) {
  if (valueNative == null || !Number.isFinite(valueNative)) return '—';
  const quoteLike = quoteFromNativePrice(valueNative, currency, fx);
  const suffix = unit ? ` ${unit}` : '';
  const ccy = String(currency).toUpperCase();
  if (ccy === 'EUR') {
    const usd = quoteLike?.priceUsd;
    return usd != null
      ? `${formatPrice(valueNative, 'EUR')}${suffix} (${usd.toFixed(decimals)} USD${suffix})`
      : `${formatPrice(valueNative, 'EUR')}${suffix}`;
  }
  const eur = quoteLike?.priceEur;
  if (eur == null) return `${valueNative.toFixed(decimals)} USD${suffix}`;
  return `${formatPrice(eur, 'EUR')}${suffix} (${valueNative.toFixed(decimals)} USD${suffix})`;
}

