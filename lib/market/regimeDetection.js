import { sma } from '../indicators.js';

/**
 * Rileva regime di mercato (euristico) da prezzi, sentiment e volatilità.
 */
export function detectMarketRegime({
  prices,
  sentimentAvg = 0,
  geoImpactIndex = 0,
  volatilityDaily = 0,
  vixLevel,
}) {
  if (!prices?.length) {
    return { regime: 'sideways', label: 'Laterale', confidence: 0.25 };
  }

  const last = prices[prices.length - 1];
  const sma20 = sma(prices, 20);
  const sma50 = sma(prices, Math.min(50, prices.length));
  const lookback = Math.min(21, prices.length - 1);
  const ret20 =
    lookback > 0 ? (last - prices[prices.length - 1 - lookback]) / prices[prices.length - 1 - lookback] : 0;

  let regime = 'sideways';
  let label = 'Laterale';

  if ((vixLevel != null && vixLevel > 35) || (volatilityDaily > 0.045 && geoImpactIndex < -4)) {
    regime = 'crisis';
    label = 'Crisi';
  } else if (
    volatilityDaily > 0.028 ||
    (vixLevel != null && vixLevel > 28) ||
    (geoImpactIndex < -6 && ret20 < -0.03)
  ) {
    regime = 'high_volatility';
    label = 'Alta volatilità';
  } else if (sma20 && sma50 && sma20 > sma50 * 1.002 && ret20 > 0.015 && sentimentAvg >= -0.1) {
    regime = 'bull';
    label = 'Bull';
  } else if (sma20 && sma50 && sma20 < sma50 * 0.998 && ret20 < -0.015) {
    regime = 'bear';
    label = 'Bear';
  }

  const confidence = Math.min(
    0.92,
    0.45 + Math.abs(ret20) * 3 + Math.abs(sentimentAvg) * 0.15 + (volatilityDaily || 0) * 2
  );

  return {
    regime,
    label,
    confidence: Number(confidence.toFixed(2)),
    metrics: {
      ret20: Number((ret20 * 100).toFixed(2)),
      sma20,
      sma50,
      vixLevel: vixLevel ?? null,
      geoImpactIndex,
      sentimentAvg,
    },
  };
}
