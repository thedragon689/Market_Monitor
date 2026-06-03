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
