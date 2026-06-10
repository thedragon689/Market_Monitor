const SEARCHABLE_TYPES = [
  'stock',
  'national',
  'index',
  'forex',
  'crypto',
  'precious',
  'commodity',
  'etf',
  'volatility',
  'rates',
  'macro',
  'sentiment',
];

const CATEGORY_LABELS = {
  stock: 'Azioni',
  national: 'Azioni nazionali',
  index: 'Indici globali',
  forex: 'Forex',
  crypto: 'Crypto',
  precious: 'Metalli preziosi',
  commodity: 'Materie prime',
  etf: 'ETF',
  volatility: 'Volatilità',
  rates: 'Tassi',
  macro: 'Macro',
  sentiment: 'Sentiment',
};

function norm(s) {
  return (s || '').toLowerCase().trim();
}

function scoreItem(item, q) {
  const id = norm(item.id);
  const name = norm(item.name);
  const hint = norm(item.hint);
  const sector = norm(item.sector);
  const region = norm(item.region);

  if (id === q || name === q) return 100;
  if (id.startsWith(q)) return 90;
  if (name.startsWith(q)) return 85;
  if (id.includes(q)) return 70;
  if (name.includes(q)) return 65;
  if (hint.includes(q)) return 50;
  if (sector.includes(q) || region.includes(q)) return 40;
  return 0;
}

/** Appiattisce il catalogo in asset cercabili. */
export function flattenCatalogAssets(catalog) {
  if (!catalog) return [];
  const out = [];
  for (const type of SEARCHABLE_TYPES) {
    for (const item of catalog[type] || []) {
      if (!item?.id) continue;
      out.push({
        ...item,
        assetType: type,
        categoryLabel: CATEGORY_LABELS[type] || type,
      });
    }
  }
  return out;
}

/**
 * Autocompletamento da prima lettera inserita.
 * @returns {Array} risultati ordinati per rilevanza
 */
export function searchCatalogAssets(assets, query, { limit = 12 } = {}) {
  const q = norm(query);
  if (!q) return [];

  return assets
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.name.localeCompare(b.item.name, 'it');
    })
    .slice(0, limit)
    .map(({ item }) => item);
}
