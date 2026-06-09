/**
 * Registry materie prime — famiglie, futures Yahoo, correlazioni e fondamentali.
 * Sincronizzare con market-quotes-frontend/src/data/symbols.js (COMMODITY_METAL_SYMBOLS).
 */

export const COMMODITY_FAMILIES = {
  energy: { label: 'Energia', icon: '⚡' },
  metals: { label: 'Metalli industriali', icon: '🔩' },
  precious: { label: 'Metalli preziosi', icon: '✦' },
  agri: { label: 'Agricoli', icon: '🌾' },
  battery: { label: 'Batterie / EV', icon: '🔋' },
};

/** Scadenze future (proxy Yahoo continuous / ETF dove indicato). */
export const COMMODITY_REGISTRY = [
  {
    id: 'WTI',
    name: 'Petrolio WTI',
    family: 'energy',
    hint: 'Crude oil West Texas Intermediate',
    pricingKind: 'perBarrel',
    unit: 'USD/barile',
    yahooSpot: 'CL=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'CL=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'CL=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'CL=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'CL=F', months: 6 },
    ],
    macro: ['DXY', 'CPI', 'OPEC'],
    inventory: { source: 'EIA', report: 'Weekly Petroleum Status', metric: 'Scorte commerciali USA' },
    geo: ['Medio Oriente', 'OPEC+', 'Mar Rosso', 'sanzioni'],
    climate: false,
    correlations: ['XAUUSD', 'DX-Y.NYB', 'SPY'],
  },
  {
    id: 'BRENT',
    name: 'Petrolio Brent',
    family: 'energy',
    hint: 'Benchmark europeo / globale',
    pricingKind: 'perBarrel',
    unit: 'USD/barile',
    yahooSpot: 'BZ=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'BZ=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'BZ=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'BZ=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'BZ=F', months: 6 },
    ],
    macro: ['DXY', 'CPI', 'OPEC'],
    inventory: { source: 'IEA/EIA', report: 'OECD stocks', metric: 'Scorte OECD' },
    geo: ['Medio Oriente', 'Ucraina', 'rotte marittime'],
    climate: false,
    correlations: ['WTI', 'XAUUSD', 'DX-Y.NYB'],
  },
  {
    id: 'NATGAS',
    name: 'Gas naturale',
    family: 'energy',
    hint: 'Henry Hub futures',
    pricingKind: 'perMmbtu',
    unit: 'USD/MMBtu',
    yahooSpot: 'NG=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'NG=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'NG=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'NG=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'NG=F', months: 6 },
    ],
    macro: ['DXY', 'temperature'],
    inventory: { source: 'EIA', report: 'Natural Gas Storage', metric: 'Scorte sotterranee USA' },
    geo: ['Russia', 'Nord Stream', 'LNG'],
    climate: true,
    correlations: ['WTI', 'DX-Y.NYB'],
  },
  {
    id: 'COPPER',
    name: 'Rame',
    family: 'metals',
    hint: 'Proxy ciclo industriale globale',
    pricingKind: 'perGramLb',
    unit: 'USD/libbra',
    yahooSpot: 'HG=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'HG=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'HG=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'HG=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'HG=F', months: 6 },
    ],
    macro: ['DXY', 'PMI', 'Cina'],
    inventory: { source: 'LME/SHFE', report: 'Warehouse stocks', metric: 'Scorte LME' },
    geo: ['Cile', 'Perù', 'scioperi miniere'],
    climate: false,
    correlations: ['SPY', 'WTI', 'XAUUSD'],
  },
  {
    id: 'NICKEL',
    name: 'Nickel',
    family: 'metals',
    hint: 'Proxy ETF (nickel futures illiquidi su Yahoo)',
    pricingKind: 'perShare',
    unit: 'USD',
    yahooSpot: 'JJN',
    proxy: 'ETF iPath Nickel',
    futures: [
      { tenor: 'spot', label: 'Proxy ETF', yahoo: 'JJN', months: 0 },
      { tenor: '1M', label: '1 mese (sint.)', yahoo: 'JJN', months: 1 },
      { tenor: '3M', label: '3 mesi (sint.)', yahoo: 'JJN', months: 3 },
      { tenor: '6M', label: '6 mesi (sint.)', yahoo: 'JJN', months: 6 },
    ],
    macro: ['DXY', 'EV demand'],
    inventory: { source: 'LME', report: 'LME stocks', metric: 'Scorte LME' },
    geo: ['Indonesia', 'Russia'],
    climate: false,
    correlations: ['COPPER', 'LIT'],
  },
  {
    id: 'LIT',
    name: 'Litio',
    family: 'battery',
    hint: 'Global X Lithium & Battery Tech ETF',
    pricingKind: 'perShare',
    unit: 'USD',
    yahooSpot: 'LIT',
    proxy: 'ETF litio / batterie',
    futures: [
      { tenor: 'spot', label: 'Proxy ETF', yahoo: 'LIT', months: 0 },
      { tenor: '1M', label: '1 mese (sint.)', yahoo: 'LIT', months: 1 },
      { tenor: '3M', label: '3 mesi (sint.)', yahoo: 'LIT', months: 3 },
      { tenor: '6M', label: '6 mesi (sint.)', yahoo: 'LIT', months: 6 },
    ],
    macro: ['EV sales', 'Cina'],
    inventory: { source: 'Benchmark Mineral', report: 'Spot lithium carbonate', metric: 'Prezzo spot Cina' },
    geo: ['Cile', 'Australia'],
    climate: false,
    correlations: ['NICKEL', 'COPPER', 'TSLA'],
  },
  {
    id: 'CORN',
    name: 'Mais',
    family: 'agri',
    hint: 'Chicago corn futures',
    pricingKind: 'perBushel',
    unit: 'USD/bushel',
    yahooSpot: 'ZC=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'ZC=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'ZC=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'ZC=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'ZC=F', months: 6 },
    ],
    macro: ['DXY', 'USD'],
    inventory: { source: 'USDA', report: 'WASDE', metric: 'Stock-to-use' },
    geo: ['Ucraina', 'Mar Nero', 'export USA'],
    climate: true,
    correlations: ['ZW=F', 'ZS=F', 'WTI'],
  },
  {
    id: 'WHEAT',
    name: 'Grano',
    family: 'agri',
    hint: 'Chicago wheat futures',
    pricingKind: 'perBushel',
    unit: 'USD/bushel',
    yahooSpot: 'ZW=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'ZW=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'ZW=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'ZW=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'ZW=F', months: 6 },
    ],
    macro: ['DXY'],
    inventory: { source: 'USDA', report: 'WASDE', metric: 'Scorte globali' },
    geo: ['Mar Nero', 'Ucraina', 'Russia'],
    climate: true,
    correlations: ['ZC=F', 'ZS=F'],
  },
  {
    id: 'SOY',
    name: 'Soia',
    family: 'agri',
    hint: 'Chicago soybean futures',
    pricingKind: 'perBushel',
    unit: 'USD/bushel',
    yahooSpot: 'ZS=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'ZS=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'ZS=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'ZS=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'ZS=F', months: 6 },
    ],
    macro: ['DXY', 'Cina demand'],
    inventory: { source: 'USDA', report: 'WASDE', metric: 'Export USA' },
    geo: ['Brasile', 'Argentina', 'Cina'],
    climate: true,
    correlations: ['ZC=F', 'ZW=F'],
  },
];

/** Metalli preziosi — profilo commodity con stesso schema. */
export const PRECIOUS_COMMODITY_PROFILE = [
  {
    id: 'XAUUSD',
    name: 'Oro',
    family: 'precious',
    pricingKind: 'perGramTroy',
    unit: 'USD/oncia troy',
    yahooSpot: 'GC=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'GC=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'GC=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'GC=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'GC=F', months: 6 },
    ],
    macro: ['DXY', 'CPI', 'real rates'],
    correlations: ['DX-Y.NYB', 'WTI', 'SPY'],
    geo: ['Fed', 'guerre', 'sanzioni'],
    climate: false,
  },
  {
    id: 'XAGUSD',
    name: 'Argento',
    family: 'precious',
    pricingKind: 'perGramTroy',
    unit: 'USD/oncia troy',
    yahooSpot: 'SI=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'SI=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'SI=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'SI=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'SI=F', months: 6 },
    ],
    macro: ['DXY', 'industrial demand'],
    correlations: ['XAUUSD', 'COPPER', 'DX-Y.NYB'],
    geo: ['Fed'],
    climate: false,
  },
  {
    id: 'XPTUSD',
    name: 'Platino',
    family: 'precious',
    pricingKind: 'perGramTroy',
    unit: 'USD/oncia troy',
    yahooSpot: 'PL=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'PL=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'PL=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'PL=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'PL=F', months: 6 },
    ],
    macro: ['auto catalyst demand'],
    correlations: ['XAUUSD', 'XPDUSD'],
    geo: ['Sudafrica', 'Russia'],
    climate: false,
  },
  {
    id: 'XPDUSD',
    name: 'Palladio',
    family: 'precious',
    pricingKind: 'perGramTroy',
    unit: 'USD/oncia troy',
    yahooSpot: 'PA=F',
    futures: [
      { tenor: 'spot', label: 'Front month', yahoo: 'PA=F', months: 0 },
      { tenor: '1M', label: '1 mese', yahoo: 'PA=F', months: 1 },
      { tenor: '3M', label: '3 mesi', yahoo: 'PA=F', months: 3 },
      { tenor: '6M', label: '6 mesi', yahoo: 'PA=F', months: 6 },
    ],
    macro: ['auto demand'],
    correlations: ['XPTUSD', 'XAUUSD'],
    geo: ['Russia', 'Sudafrica'],
    climate: false,
  },
];

export function getCommodityProfile(symbol, type) {
  const id = String(symbol).toUpperCase();
  if (type === 'precious' || type === 'metal') {
    return PRECIOUS_COMMODITY_PROFILE.find((c) => c.id === id) ?? null;
  }
  if (type === 'commodity') {
    return COMMODITY_REGISTRY.find((c) => c.id === id) ?? null;
  }
  return null;
}

export function commodityIds(type) {
  if (type === 'precious' || type === 'metal') {
    return PRECIOUS_COMMODITY_PROFILE.map((c) => c.id);
  }
  return COMMODITY_REGISTRY.map((c) => c.id);
}

export function yahooSymbolFor(symbol, type) {
  const profile = getCommodityProfile(symbol, type);
  if (profile?.yahooSpot) return profile.yahooSpot;
  return null;
}
