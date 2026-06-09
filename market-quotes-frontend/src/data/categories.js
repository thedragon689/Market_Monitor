export const CATEGORY_GROUPS = [
  { id: 'primary', label: 'Categorie principali' },
  { id: 'advanced', label: 'Categorie avanzate' },
  { id: 'internal', label: 'Categorie interne' },
];

export const MARKET_CATEGORIES = [
  {
    id: 'stock',
    group: 'primary',
    label: 'Azioni',
    headline: 'Titoli internazionali',
    description: 'USA, Europa e Africa',
    unit: '€ / azione',
    tone: 'stock',
    icon: '◆',
  },
  {
    id: 'national',
    group: 'primary',
    label: 'Azioni nazionali',
    headline: 'Borsa Italiana',
    description: 'Blue chip FTSE MIB',
    unit: '€ / azione',
    tone: 'national',
    icon: '◇',
  },
  {
    id: 'index',
    group: 'primary',
    label: 'Indici globali',
    headline: 'Benchmark mondiali',
    description: 'S&P 500, Nasdaq, DAX, Nikkei…',
    unit: 'punti indice',
    tone: 'index',
    icon: '◎',
  },
  {
    id: 'forex',
    group: 'primary',
    label: 'Forex',
    headline: 'Valute',
    description: 'Coppie major e cross',
    unit: 'tasso di cambio',
    tone: 'forex',
    icon: '¤',
  },
  {
    id: 'commodity',
    group: 'primary',
    label: 'Materie prime',
    headline: 'Commodities',
    description: 'Energia, metalli, agricoli, curva forward',
    unit: '€ / barile o unità',
    tone: 'commodity',
    icon: '▲',
  },
  {
    id: 'precious',
    group: 'primary',
    label: 'Metalli preziosi',
    headline: 'Oro e metalli',
    description: 'Oro, argento, platino, palladio',
    unit: '€ / grammo',
    tone: 'precious',
    icon: '●',
  },
  {
    id: 'etf',
    group: 'primary',
    label: 'ETF',
    headline: 'Exchange Traded Funds',
    description: 'SPY, QQQ, settoriali e commodity ETF',
    unit: '€ / quota',
    tone: 'etf',
    icon: '▦',
  },
  {
    id: 'crypto',
    group: 'primary',
    label: 'Crypto',
    headline: 'Criptovalute',
    description: 'BTC, ETH e altcoin — live WS su BTC/ETH',
    unit: '€ / coin',
    tone: 'crypto',
    icon: '₿',
  },
  {
    id: 'volatility',
    group: 'advanced',
    label: 'Volatilità',
    headline: 'VIX e indici',
    description: 'VIX, VVIX, SKEW — gauge del rischio',
    unit: 'punti',
    tone: 'volatility',
    icon: '⚡',
  },
  {
    id: 'rates',
    group: 'advanced',
    label: 'Tassi e obbligazioni',
    headline: 'Yield e bond ETF',
    description: 'Treasury USA, investment grade, high yield',
    unit: '% o USD',
    tone: 'rates',
    icon: '⎓',
  },
  {
    id: 'macro',
    group: 'advanced',
    label: 'Macro',
    headline: 'CPI · PPI · Dollaro',
    description: 'Proxy ETF per inflazione, DXY, commodities',
    unit: 'indice / USD',
    tone: 'macro',
    icon: '◉',
  },
  {
    id: 'sentiment',
    group: 'advanced',
    label: 'Sentiment',
    headline: 'Risk-on / risk-off',
    description: 'VIX, high yield, safe haven — integra news geo',
    unit: 'indice / USD',
    tone: 'sentiment',
    icon: '◐',
  },
];

/** Sezioni interne — navigazione verso viste/pannelli (non tipi di mercato). */
export const INTERNAL_SECTIONS = [
  {
    id: 'technical',
    group: 'internal',
    label: 'Analisi tecnica',
    headline: 'RSI · MACD · SMA',
    description: 'Indicatori e segnali',
    tone: 'internal',
    icon: '📈',
    view: 'analysis',
    analysisPanels: ['indicators'],
  },
  {
    id: 'forecasts',
    group: 'internal',
    label: 'Previsioni',
    headline: 'ARIMA · LSTM · classici',
    description: 'Scenari e modelli ML',
    tone: 'internal',
    icon: '🔮',
    view: 'forecast',
    forecastPanels: ['params', 'advanced'],
  },
  {
    id: 'correlations',
    group: 'internal',
    label: 'Correlazioni',
    headline: 'Benchmark ρ',
    description: 'Oro ↔ Dollaro, BTC ↔ Nasdaq…',
    tone: 'internal',
    icon: '🔗',
    view: 'analysis',
    analysisPanels: ['correlations'],
  },
  {
    id: 'news',
    group: 'internal',
    label: 'News & eventi',
    headline: 'Geo · sentiment · alert',
    description: 'Notizie e impatto sul mercato',
    tone: 'internal',
    icon: '📰',
    view: 'analysis',
    analysisPanels: ['geo'],
  },
];

export function getCategoryMeta(id) {
  return MARKET_CATEGORIES.find((c) => c.id === id) ?? MARKET_CATEGORIES[0];
}

export function categoriesByGroup(groupId) {
  return MARKET_CATEGORIES.filter((c) => c.group === groupId);
}

export function categoryCount(summary, id) {
  if (!summary) return null;
  const map = {
    stock: summary.stocks?.total,
    national: summary.national?.total,
    index: summary.indices?.total,
    forex: summary.forex?.total,
    crypto: summary.crypto?.total,
    precious: summary.precious?.total,
    commodity: summary.commodities?.total,
    etf: summary.etf?.total,
    volatility: summary.volatility?.total,
    rates: summary.rates?.total,
    macro: summary.macro?.total,
    sentiment: summary.sentiment?.total,
  };
  return map[id] ?? null;
}

export const MARKET_TYPE_IDS = MARKET_CATEGORIES.map((c) => c.id);
