/**
 * Registro criptovalute — id UI/API, simbolo Yahoo, ticker Stooq.
 * Sincronizzato con market-quotes-frontend/src/data/symbols.js
 */

export const CRYPTO_ASSETS = [
  {
    id: 'BTC-USD',
    yahoo: 'BTC-USD',
    stooq: 'btcusd',
    binance: 'BTCUSDT',
    kraken: 'XBTUSD',
    name: 'Bitcoin',
    hint: 'Layer 1 · riserva di valore',
    family: 'Layer 1',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'ETH-USD',
    yahoo: 'ETH-USD',
    stooq: 'ethusd',
    binance: 'ETHUSDT',
    kraken: 'ETHUSD',
    name: 'Ethereum',
    hint: 'Smart contract · DeFi',
    family: 'Layer 1',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'SOL-USD',
    yahoo: 'SOL-USD',
    stooq: 'solusd',
    name: 'Solana',
    hint: 'Alta velocità · DeFi/NFT',
    family: 'Layer 1',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'XRP-USD',
    yahoo: 'XRP-USD',
    stooq: 'xrpusd',
    name: 'XRP',
    hint: 'Pagamenti cross-border',
    family: 'Pagamenti',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'ADA-USD',
    yahoo: 'ADA-USD',
    stooq: 'adausd',
    name: 'Cardano',
    hint: 'Proof-of-stake · ricerca accademica',
    family: 'Layer 1',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'BNB-USD',
    yahoo: 'BNB-USD',
    stooq: 'bnbusd',
    name: 'BNB',
    hint: 'Exchange · BNB Chain',
    family: 'Exchange',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'DOGE-USD',
    yahoo: 'DOGE-USD',
    stooq: 'dogusd',
    name: 'Dogecoin',
    hint: 'Meme · pagamenti social',
    family: 'Meme',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'DOT-USD',
    yahoo: 'DOT-USD',
    stooq: 'dotusd',
    name: 'Polkadot',
    hint: 'Interoperabilità · parachain',
    family: 'Layer 0',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'LINK-USD',
    yahoo: 'LINK-USD',
    stooq: 'linkusd',
    name: 'Chainlink',
    hint: 'Oracle · DeFi infrastructure',
    family: 'Infrastructure',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'AVAX-USD',
    yahoo: 'AVAX-USD',
    stooq: 'avaxusd',
    name: 'Avalanche',
    hint: 'Layer 1 · subnet',
    family: 'Layer 1',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'MATIC-USD',
    yahoo: 'MATIC-USD',
    stooq: 'maticusd',
    name: 'Polygon',
    hint: 'Scaling Ethereum',
    family: 'Layer 2',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'LTC-USD',
    yahoo: 'LTC-USD',
    stooq: 'ltcusd',
    name: 'Litecoin',
    hint: 'Pagamenti · early altcoin',
    family: 'Payments',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'UNI-USD',
    yahoo: 'UNI-USD',
    stooq: 'uniusd',
    name: 'Uniswap',
    hint: 'DEX · DeFi',
    family: 'DeFi',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'ATOM-USD',
    yahoo: 'ATOM-USD',
    stooq: 'atomusd',
    name: 'Cosmos',
    hint: 'Interchain · IBC',
    family: 'Layer 0',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
  {
    id: 'SHIB-USD',
    yahoo: 'SHIB-USD',
    stooq: 'shibusd',
    name: 'Shiba Inu',
    hint: 'Meme · community token',
    family: 'Meme',
    pricingKind: 'perCoin',
    unit: 'USD/coin',
  },
];

const BY_ID = new Map(CRYPTO_ASSETS.map((a) => [a.id.toUpperCase(), a]));

export function getCryptoEntry(symbol) {
  return BY_ID.get(String(symbol).trim().toUpperCase()) ?? null;
}

export function toYahooCryptoSymbol(symbol) {
  const entry = getCryptoEntry(symbol);
  if (entry?.yahoo) return entry.yahoo;
  const id = String(symbol).trim().toUpperCase();
  return id.includes('-') ? id : `${id}-USD`;
}

export function toStooqCryptoSymbol(symbol) {
  const entry = getCryptoEntry(symbol);
  if (entry?.stooq) return String(entry.stooq).toLowerCase();
  return `${String(symbol).replace(/[^a-z0-9]/gi, '').toLowerCase()}usd`;
}

/** Id CoinGecko per i principali asset (per il provider di fallback crypto). */
const COINGECKO_IDS = {
  'BTC-USD': 'bitcoin',
  'ETH-USD': 'ethereum',
  'SOL-USD': 'solana',
  'XRP-USD': 'ripple',
  'ADA-USD': 'cardano',
  'BNB-USD': 'binancecoin',
  'DOGE-USD': 'dogecoin',
  'DOT-USD': 'polkadot',
  'LINK-USD': 'chainlink',
  'AVAX-USD': 'avalanche-2',
  'MATIC-USD': 'matic-network',
  'LTC-USD': 'litecoin',
  'UNI-USD': 'uniswap',
  'ATOM-USD': 'cosmos',
  'SHIB-USD': 'shiba-inu',
};

export function toCoinGeckoId(symbol) {
  const id = String(symbol).trim().toUpperCase();
  if (COINGECKO_IDS[id]) return COINGECKO_IDS[id];
  const base = id.replace(/-USD$/, '');
  return COINGECKO_IDS[`${base}-USD`] || null;
}
