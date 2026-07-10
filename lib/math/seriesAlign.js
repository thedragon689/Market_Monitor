/** Allineamento serie per giorno di trading e rendimenti log. */

export function alignPriceSeriesByDate(seriesA, seriesB) {
  if (!seriesA?.length || !seriesB?.length) return [];
  const mapB = new Map(seriesB.map((p) => [p.date, p.price]));
  const out = [];
  for (const a of seriesA) {
    const pb = mapB.get(a.date);
    if (pb != null && Number.isFinite(pb) && Number.isFinite(a.price)) {
      out.push({ date: a.date, priceA: a.price, priceB: pb });
    }
  }
  return out;
}

/** Rendimenti logaritmici accoppiati su stesse date (n−1 coppie). */
export function pairedLogReturns(aligned) {
  const retA = [];
  const retB = [];
  for (let i = 1; i < aligned.length; i++) {
    const gapDays = Math.round(
      (new Date(aligned[i].date) - new Date(aligned[i - 1].date)) / 86_400_000
    );
    // Salta gap anomali (dati mancanti o allineamento errato).
    if (gapDays > 7 || gapDays < 1) continue;

    const pa0 = aligned[i - 1].priceA;
    const pa1 = aligned[i].priceA;
    const pb0 = aligned[i - 1].priceB;
    const pb1 = aligned[i].priceB;
    if (pa0 > 0 && pa1 > 0 && pb0 > 0 && pb1 > 0) {
      retA.push(Math.log(pa1 / pa0));
      retB.push(Math.log(pb1 / pb0));
    }
  }
  return { retA, retB };
}

export function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 8) return null;
  const x = a.slice(-n);
  const y = b.slice(-n);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = x[i] - mx;
    const vy = y[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  return den ? num / den : null;
}

/** Correlazione Pearson su rendimenti log allineati per data. */
export function pearsonLogReturnsAligned(seriesA, seriesB) {
  const aligned = alignPriceSeriesByDate(seriesA, seriesB);
  const { retA, retB } = pairedLogReturns(aligned);
  return pearson(retA, retB);
}

/**
 * Beta su rendimenti log allineati per data (coerente con correlazioni Pearson).
 * β = Cov(rₐ, rᵦ) / Var(rᵦ)
 */
export function betaLogReturnsAligned(seriesA, seriesB) {
  const aligned = alignPriceSeriesByDate(seriesA, seriesB);
  const { retA, retB } = pairedLogReturns(aligned);
  const n = retA.length;
  if (n < 8) return null;

  const meanA = retA.reduce((s, v) => s + v, 0) / n;
  const meanB = retB.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    cov += (retA[i] - meanA) * (retB[i] - meanB);
    varB += (retB[i] - meanB) ** 2;
  }
  cov /= n;
  varB /= n;
  if (!varB) return null;

  return {
    beta: Number((cov / varB).toFixed(3)),
    observations: n,
    method: 'log_returns_aligned',
  };
}
