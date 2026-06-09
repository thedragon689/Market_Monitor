import { fetchYahooCommodityChart } from './yahooMarket.js';

const MACRO_SYMBOLS = {
  DXY: { yahoo: 'DX-Y.NYB', label: 'Indice dollaro (DXY)', family: 'fx' },
  SPY: { yahoo: 'SPY', label: 'S&P 500 (risk-on)', family: 'equity' },
  TIP: { yahoo: 'TIP', label: 'TIPS (inflazione reale)', family: 'inflation' },
  UUP: { yahoo: 'UUP', label: 'USD ETF', family: 'fx' },
};

/**
 * Snapshot macro rilevante per commodities (proxy Yahoo).
 */
export async function fetchMacroSnapshot(relevant = ['DXY', 'SPY', 'TIP']) {
  const out = [];
  for (const key of relevant) {
    const meta = MACRO_SYMBOLS[key];
    if (!meta) continue;
    try {
      const chart = await fetchYahooCommodityChart(meta.yahoo, '1mo');
      const price = chart.quote?.price ?? chart.series?.at(-1)?.price;
      const prev = chart.series?.at(-2)?.price;
      const changePct =
        price != null && prev ? Number((((price - prev) / prev) * 100).toFixed(3)) : null;
      out.push({
        id: key,
        label: meta.label,
        family: meta.family,
        price: price != null ? Number(price.toFixed(4)) : null,
        changePct,
        asOf: chart.quote?.asOf ?? null,
      });
    } catch {
      out.push({ id: key, label: meta.label, family: meta.family, price: null, error: true });
    }
  }
  return out;
}

export function macroNarrative(macro, profile) {
  const dxy = macro.find((m) => m.id === 'DXY' || m.id === 'UUP');
  const tips = macro.find((m) => m.id === 'TIP');
  const notes = [];

  if (dxy?.changePct != null) {
    notes.push(
      dxy.changePct > 0
        ? 'Dollaro forte — pressione tipica su commodities USD-denominate.'
        : 'Dollaro debole — supporto potenziale per materie prime.'
    );
  }
  if (tips?.changePct != null && profile?.family === 'precious') {
    notes.push('TIPS in movimento — oro sensibile a rendimenti reali.');
  }
  if (profile?.macro?.includes('OPEC')) {
    notes.push('Monitorare decisioni OPEC+ e report EIA settimanali.');
  }
  if (profile?.climate) {
    notes.push('Clima e USDA/WASDE influenzano fortemente questa commodity agricola.');
  }

  return notes;
}
