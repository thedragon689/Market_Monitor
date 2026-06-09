import { fetchYahooCommodityChart } from './yahooMarket.js';

/**
 * Costruisce forward curve e classifica contango / backwardation.
 * Se una sola fonte Yahoo: stime 1M/3M/6M da carry storico (trasparente).
 */
export async function buildForwardCurve(profile, spotPrice, historicalPrices = []) {
  if (!profile?.futures?.length) return null;

  const spotEntry = profile.futures.find((f) => f.tenor === 'spot') ?? profile.futures[0];
  let spot = spotPrice;

  if (spot == null) {
    try {
      const chart = await fetchYahooCommodityChart(spotEntry.yahoo);
      spot = chart.quote?.price ?? chart.series?.at(-1)?.price ?? null;
    } catch {
      spot = historicalPrices.at(-1) ?? null;
    }
  }

  if (spot == null) return null;

  const carry = estimateCarry(historicalPrices);
  const uniqueYahoo = [...new Set(profile.futures.map((f) => f.yahoo))];

  const priceByYahoo = { [spotEntry.yahoo]: spot };
  for (const y of uniqueYahoo) {
    if (priceByYahoo[y] != null) continue;
    try {
      const chart = await fetchYahooCommodityChart(y);
      priceByYahoo[y] = chart.quote?.price ?? chart.series?.at(-1)?.price ?? null;
    } catch {
      priceByYahoo[y] = null;
    }
  }

  const points = profile.futures.map((f) => {
    const raw = priceByYahoo[f.yahoo];
    const sameAsSpot = f.yahoo === spotEntry.yahoo && f.months > 0;
    const synthetic = sameAsSpot || raw == null;
    const price =
      !synthetic && f.months === 0
        ? raw
        : !synthetic && f.months > 0
          ? raw
          : Number((spot * (1 + carry * f.months)).toFixed(6));

    return {
      tenor: f.tenor,
      label: f.label,
      months: f.months,
      price,
      yahoo: f.yahoo,
      synthetic,
      basis: price != null && spot ? Number((price - spot).toFixed(6)) : null,
      basisPct: price != null && spot ? Number((((price - spot) / spot) * 100).toFixed(3)) : null,
    };
  });

  const futurePoints = points.filter((p) => p.months > 0);
  const avgFuture =
    futurePoints.length > 0
      ? futurePoints.reduce((s, p) => s + p.price, 0) / futurePoints.length
      : null;

  let structure = 'flat';
  if (avgFuture != null && spot) {
    const diffPct = ((avgFuture - spot) / spot) * 100;
    if (diffPct > 0.15) structure = 'contango';
    else if (diffPct < -0.15) structure = 'backwardation';
  }

  return {
    spot: Number(spot.toFixed(6)),
    points,
    structure,
    structureLabel:
      structure === 'contango'
        ? 'Contango — futures > spot'
        : structure === 'backwardation'
          ? 'Backwardation — futures < spot'
          : 'Curva piatta',
    carryMonthly: Number((carry * 100).toFixed(4)),
    interpretation:
      structure === 'contango'
        ? 'Mercato con costi di carry/stoccaggio o domanda spot debole.'
        : structure === 'backwardation'
          ? 'Tensione di offerta spot o domanda immediata elevata.'
          : 'Struttura neutra sulla finestra analizzata.',
  };
}

function estimateCarry(prices) {
  const data = (prices || []).filter((p) => Number.isFinite(p));
  if (data.length < 20) return 0.001;
  const n = Math.min(60, data.length);
  const slice = data.slice(-n);
  const logRet = [];
  for (let i = 1; i < slice.length; i++) {
    logRet.push(Math.log(slice[i] / slice[i - 1]));
  }
  const mean = logRet.reduce((a, b) => a + b, 0) / logRet.length;
  return mean * 21;
}
