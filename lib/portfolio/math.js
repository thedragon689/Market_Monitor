import { BASE_CURRENCY } from './currency.js';

/** Calcoli P/L e prezzo medio ponderato. */

export function calcPosition({ quantity, avgPrice, currentPrice }) {
  const qty = Number(quantity);
  const avg = Number(avgPrice);
  const cur = Number(currentPrice);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(avg) || avg <= 0) {
    return { currentValue: null, costBasis: null, pl: null, plPercent: null };
  }
  if (!Number.isFinite(cur) || cur <= 0) {
    return {
      currentValue: null,
      costBasis: qty * avg,
      pl: null,
      plPercent: null,
    };
  }
  const currentValue = qty * cur;
  const costBasis = qty * avg;
  const pl = (cur - avg) * qty;
  const plPercent = (cur / avg - 1) * 100;
  return { currentValue, costBasis, pl, plPercent };
}

/** Prezzo medio dopo un acquisto (media ponderata). */
export function avgPriceAfterBuy(oldQty, oldAvg, buyQty, buyPrice) {
  const oq = Number(oldQty) || 0;
  const oa = Number(oldAvg) || 0;
  const bq = Number(buyQty);
  const bp = Number(buyPrice);
  const newQty = oq + bq;
  if (newQty <= 0) return 0;
  return (oq * oa + bq * bp) / newQty;
}

/**
 * Aggrega posizioni in valuta base (campi *Base).
 * Con posizioni senza prezzo live (partial), P/L solo sulle posizioni quotate.
 */
export function sumDashboard(positions) {
  let totalValue = 0;
  let totalCost = 0;
  let pricedCount = 0;
  let partial = false;

  for (const p of positions) {
    const cost = p.costBasisBase ?? p.costBasis;
    if (cost != null) totalCost += cost;

    if (p.currentValueBase != null) {
      totalValue += p.currentValueBase;
      pricedCount += 1;
    } else if (cost != null) {
      partial = true;
    }
  }

  const hasPrices = pricedCount > 0;
  const allPriced = hasPrices && !partial;

  let totalPl = null;
  let totalPlPercent = null;
  if (allPriced && totalCost > 0) {
    totalPl = totalValue - totalCost;
    totalPlPercent = (totalPl / totalCost) * 100;
  }

  return {
    totalValue: hasPrices ? totalValue : null,
    totalCost,
    totalPl,
    totalPlPercent,
    partial,
    baseCurrency: BASE_CURRENCY,
  };
}
