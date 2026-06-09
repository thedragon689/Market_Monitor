/** Materie prime — sincronizzato con lib/commodityRegistry.js */

export const COMMODITY_METAL_SYMBOLS = [
  {
    id: 'WTI',
    name: 'Petrolio WTI',
    family: 'energy',
    hint: 'Energia · barile · futures front month',
    pricingKind: 'perBarrel',
    unit: 'USD/barile',
  },
  {
    id: 'BRENT',
    name: 'Petrolio Brent',
    family: 'energy',
    hint: 'Benchmark globale · barile',
    pricingKind: 'perBarrel',
    unit: 'USD/barile',
  },
  {
    id: 'NATGAS',
    name: 'Gas naturale',
    family: 'energy',
    hint: 'Henry Hub · MMBtu',
    pricingKind: 'perMmbtu',
    unit: 'USD/MMBtu',
  },
  {
    id: 'COPPER',
    name: 'Rame',
    family: 'metals',
    hint: 'Industriale · prezzo al grammo',
    pricingKind: 'perGramLb',
    unit: 'USD/libbra',
  },
  {
    id: 'NICKEL',
    name: 'Nickel',
    family: 'metals',
    hint: 'Proxy ETF iPath (JJN)',
    pricingKind: 'perShare',
    unit: 'USD',
  },
  {
    id: 'LIT',
    name: 'Litio',
    family: 'battery',
    hint: 'ETF litio / batterie (LIT)',
    pricingKind: 'perShare',
    unit: 'USD',
  },
  {
    id: 'CORN',
    name: 'Mais',
    family: 'agri',
    hint: 'Chicago corn · bushel',
    pricingKind: 'perBushel',
    unit: 'USD/bushel',
  },
  {
    id: 'WHEAT',
    name: 'Grano',
    family: 'agri',
    hint: 'Chicago wheat · bushel',
    pricingKind: 'perBushel',
    unit: 'USD/bushel',
  },
  {
    id: 'SOY',
    name: 'Soia',
    family: 'agri',
    hint: 'Chicago soybean · bushel',
    pricingKind: 'perBushel',
    unit: 'USD/bushel',
  },
];

export const COMMODITY_FAMILY_LABELS = {
  energy: 'Energia',
  metals: 'Metalli industriali',
  battery: 'Batterie / EV',
  agri: 'Agricoli',
  precious: 'Metalli preziosi',
};
