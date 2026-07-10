/**
 * Tax-loss harvesting — identifica posizioni in perdita rilevanti.
 */
export function findTaxLossCandidates(positions, { minLossPct = 5, minLossValue = 50 } = {}) {
  if (!positions?.length) return { candidates: [], summary: { count: 0, totalHarvestable: 0 } };

  const candidates = positions
    .filter((p) => {
      const pl = p.plBase ?? p.pl;
      const plPct = p.plPercent;
      if (pl == null || pl >= 0) return false;
      if (plPct != null && plPct > -minLossPct) return false;
      if (Math.abs(pl) < minLossValue) return false;
      return true;
    })
    .map((p) => ({
      symbol: p.symbol,
      assetType: p.assetType,
      pl: Number((p.plBase ?? p.pl).toFixed(2)),
      plPercent: p.plPercent != null ? Number(p.plPercent.toFixed(2)) : null,
      currentValue: p.currentValueBase ?? p.currentValue,
      suggestion:
        'Valuta vendita per realizzare perdita fiscale (verifica normativa locale e wash-sale rule).',
      priority: (p.plPercent ?? 0) <= -15 ? 'high' : 'medium',
    }))
    .sort((a, b) => (a.pl ?? 0) - (b.pl ?? 0));

  const totalHarvestable = candidates.reduce((s, c) => s + Math.abs(c.pl), 0);

  return {
    candidates,
    summary: {
      count: candidates.length,
      totalHarvestable: Number(totalHarvestable.toFixed(2)),
      disclaimer: 'Solo indicazioni educative — non costituisce consulenza fiscale.',
    },
  };
}
