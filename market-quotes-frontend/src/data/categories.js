export const MARKET_CATEGORIES = [
  {
    id: 'stock',
    label: 'Azioni',
    headline: 'Titoli internazionali',
    description: 'USA, Europa e Africa — prezzo per singola azione',
    unit: '€ / azione',
    tone: 'stock',
  },
  {
    id: 'national',
    label: 'Azioni nazionali',
    headline: 'Borsa Italiana',
    description: 'Blue chip FTSE MIB — quotati in euro',
    unit: '€ / azione',
    tone: 'national',
  },
  {
    id: 'crypto',
    label: 'Criptovalute',
    headline: 'Crypto spot',
    description: 'Bitcoin, Ethereum e altcoin — prezzo per coin',
    unit: '€ / coin',
    tone: 'crypto',
  },
  {
    id: 'precious',
    label: 'Metalli preziosi',
    headline: 'Oro e metalli',
    description: 'Oro, argento, platino e palladio — quotati al grammo',
    unit: '€ / grammo',
    tone: 'precious',
  },
  {
    id: 'commodity',
    label: 'Materie prime',
    headline: 'Commodities',
    description: 'Energia, metalli, agricoli — spot, futures, curva e modelli ML',
    unit: '€ / barile o g',
    tone: 'commodity',
  },
];

export function getCategoryMeta(id) {
  return MARKET_CATEGORIES.find((c) => c.id === id) ?? MARKET_CATEGORIES[0];
}

export function categoryCount(summary, id) {
  if (!summary) return null;
  if (id === 'stock') return summary.stocks?.total ?? null;
  if (id === 'national') return summary.national?.total ?? null;
  if (id === 'crypto') return summary.crypto?.total ?? null;
  if (id === 'precious') return summary.precious?.total ?? null;
  if (id === 'commodity') return summary.commodities?.total ?? null;
  return null;
}
