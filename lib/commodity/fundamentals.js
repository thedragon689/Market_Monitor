/**
 * Riferimenti fondamentali (produzione, scorte, clima) — struttura + link report.
 * Dati live EIA/USDA richiedono API key dedicate; qui forniamo contesto e checklist.
 */

export const FUNDAMENTAL_REPORTS = {
  EIA: {
    label: 'U.S. Energy Information Administration',
    url: 'https://www.eia.gov/petroleum/weekly/',
    frequency: 'Settimanale',
    metrics: ['Scorte petrolio', 'Produzione', 'Rig count Baker Hughes'],
  },
  USDA: {
    label: 'USDA WASDE',
    url: 'https://www.usda.gov/oce/commodity/wasde',
    frequency: 'Mensile',
    metrics: ['Raccolti', 'Stock-to-use', 'Export'],
  },
  OPEC: {
    label: 'OPEC Monthly Oil Market Report',
    url: 'https://www.opec.org/opec_web/en/publications/338.htm',
    frequency: 'Mensile',
    metrics: ['Produzione OPEC', 'Domanda globale'],
  },
  LME: {
    label: 'London Metal Exchange',
    url: 'https://www.lme.com/',
    frequency: 'Giornaliero',
    metrics: ['Scorte warehouse', 'Prezzi ufficiali'],
  },
};

export function buildFundamentalsContext(profile) {
  if (!profile) return null;

  const blocks = [];

  if (profile.inventory) {
    blocks.push({
      type: 'inventory',
      title: 'Scorte e inventario',
      source: profile.inventory.source,
      report: profile.inventory.report,
      metric: profile.inventory.metric,
      link: FUNDAMENTAL_REPORTS[profile.inventory.source]?.url ?? null,
    });
  }

  if (profile.family === 'energy') {
    blocks.push({
      type: 'production',
      title: 'Produzione energia',
      items: ['Produzione USA (barili/giorno)', 'Rig count Baker Hughes', 'Utilizzo raffinerie'],
      link: FUNDAMENTAL_REPORTS.EIA.url,
    });
  }

  if (profile.family === 'agri') {
    blocks.push({
      type: 'climate',
      title: 'Clima e raccolti',
      items: ['El Niño / La Niña', 'Siccità / alluvioni', 'Report USDA WASDE', 'Stock-to-use ratio'],
      link: FUNDAMENTAL_REPORTS.USDA.url,
    });
  }

  if (profile.family === 'metals' || profile.family === 'battery') {
    blocks.push({
      type: 'supply',
      title: 'Offerta industriale',
      items: ['Output miniere', 'Domanda Cina / EV', 'Scorte LME'],
      link: FUNDAMENTAL_REPORTS.LME.url,
    });
  }

  if (profile.geo?.length) {
    blocks.push({
      type: 'geopolitical',
      title: 'Fattori geopolitici chiave',
      items: profile.geo,
    });
  }

  return { blocks, reports: FUNDAMENTAL_REPORTS };
}
