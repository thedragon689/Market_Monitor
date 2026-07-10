import { trendFromSpark } from '../notifications/sparkTrend.js';

const FORECAST_TREND_PCT = 2.5;

/**
 * Previsione leggera dal trend recente (sparkline) — usata dal cron portfolio.
 * @returns {{ trendPct: number, trendLabel: string, direction: 'up'|'down' } | null}
 */
export function buildLightForecast(pos) {
  const trend = trendFromSpark(pos.sparkPoints);
  if (!trend || Math.abs(trend.pct) < FORECAST_TREND_PCT) return null;
  return {
    trendPct: trend.pct,
    trendLabel: trend.label,
    direction: trend.pct > 0 ? 'up' : 'down',
  };
}

/**
 * Consiglio operativo leggero da P/L e trend — focalizzato su vendita/riduzione.
 * @returns {{ action: string, actionLabel: string, summary: string } | null}
 */
export function buildLightAdvice(pos) {
  const pl = Number(pos.plPercent);
  if (!Number.isFinite(pl)) return null;
  const trend = trendFromSpark(pos.sparkPoints);
  const symbol = pos.symbol;

  if (pl >= 20) {
    return {
      action: 'sell',
      actionLabel: 'Vendi / prendi profitto',
      summary: `${symbol}: guadagno +${pl.toFixed(1)}% — valuta la presa di profitto.`,
    };
  }
  if (pl >= 10 && trend && trend.pct < -1) {
    return {
      action: 'reduce',
      actionLabel: 'Riduci esposizione',
      summary: `${symbol}: +${pl.toFixed(1)}% ma trend in discesa — considera una riduzione.`,
    };
  }
  if (pl <= -15 && trend && trend.pct > 1) {
    return {
      action: 'accumulate',
      actionLabel: 'Possibile accumulo',
      summary: `${symbol}: ${pl.toFixed(1)}% con segnali di ripresa — rivaluta la tesi.`,
    };
  }
  if (pl <= -20) {
    return {
      action: 'reduce',
      actionLabel: 'Limita le perdite',
      summary: `${symbol}: perdita ${pl.toFixed(1)}% — rivedi stop-loss o riduci la posizione.`,
    };
  }
  return null;
}
