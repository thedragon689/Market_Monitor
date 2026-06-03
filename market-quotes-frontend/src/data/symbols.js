/** Sincronizzato con lib/stockRegistry.js, lib/nationalStockRegistry.js, lib/cryptoRegistry.js */

const base = { pricingKind: 'perShare' };
const coin = { pricingKind: 'perCoin', unit: 'USD/coin' };

const us = (row) => ({ ...base, ...row, region: 'USA', market: 'US' });
const eu = (row) => ({ ...base, ...row, region: 'Europa', market: 'EU' });
const af = (row) => ({ ...base, ...row, region: 'Africa', market: 'AF' });
const it = (row) => ({ ...base, ...row, region: 'Italia', market: 'IT' });

export const US_STOCKS = [
  us({ id: 'AAPL', name: 'Apple', hint: 'Tech · USA', sector: 'Tech' }),
  us({ id: 'MSFT', name: 'Microsoft', hint: 'Software · USA', sector: 'Tech' }),
  us({ id: 'GOOGL', name: 'Alphabet', hint: 'Google · USA', sector: 'Tech' }),
  us({ id: 'AMZN', name: 'Amazon', hint: 'E-commerce · USA', sector: 'Tech' }),
  us({ id: 'META', name: 'Meta', hint: 'Social · USA', sector: 'Tech' }),
  us({ id: 'NVDA', name: 'Nvidia', hint: 'Chip · USA', sector: 'Tech' }),
  us({ id: 'TSLA', name: 'Tesla', hint: 'Auto · USA', sector: 'Auto' }),
  us({ id: 'JPM', name: 'JPMorgan', hint: 'Banca · USA', sector: 'Finanza' }),
  us({ id: 'V', name: 'Visa', hint: 'Pagamenti · USA', sector: 'Finanza' }),
  us({ id: 'XOM', name: 'Exxon Mobil', hint: 'Energia · USA', sector: 'Energia' }),
  us({
    id: 'IOR',
    name: 'IOR',
    hint: 'Income Opportunity Realty Investors · NYSE American',
    sector: 'Real Estate',
  }),
];

export const EU_STOCKS = [
  eu({ id: 'SAP.DE', name: 'SAP', hint: 'Software · Germania', sector: 'Tech' }),
  eu({ id: 'ASML.AS', name: 'ASML', hint: 'Semiconduttori · Paesi Bassi', sector: 'Tech' }),
  eu({ id: 'MC.PA', name: 'LVMH', hint: 'Lusso · Francia', sector: 'Consumer' }),
  eu({ id: 'BMW.DE', name: 'BMW', hint: 'Auto · Germania', sector: 'Auto' }),
  eu({ id: 'NESN.SW', name: 'Nestlé', hint: 'Consumer · Svizzera', sector: 'Consumer' }),
  eu({ id: 'TTE.PA', name: 'TotalEnergies', hint: 'Energia · Francia', sector: 'Energia' }),
  eu({ id: 'AIR.PA', name: 'Airbus', hint: 'Aerospazio · Francia', sector: 'Industriale' }),
  eu({ id: 'SAN.MC', name: 'Santander', hint: 'Banca · Spagna', sector: 'Finanza' }),
];

export const AFRICA_STOCKS = [
  af({ id: 'GFI', name: 'Gold Fields', hint: 'Oro · Sudafrica (ADR)', sector: 'Mining' }),
  af({ id: 'SSL', name: 'Sasol', hint: 'Energia · Sudafrica (ADR)', sector: 'Energia' }),
  af({ id: 'NPSNY', name: 'Naspers', hint: 'Tech · Sudafrica (ADR)', sector: 'Tech' }),
  af({ id: 'ANGPY', name: 'Anglo American', hint: 'Mining · Africa (ADR)', sector: 'Mining' }),
  af({ id: 'MTNOY', name: 'MTN Group', hint: 'Telecom · Africa (ADR)', sector: 'Telecom' }),
  af({ id: 'DRD', name: 'DRDGOLD', hint: 'Oro · Sudafrica (ADR)', sector: 'Mining' }),
];

export const STOCK_SYMBOLS = [...US_STOCKS, ...EU_STOCKS, ...AFRICA_STOCKS];

export const NATIONAL_STOCKS = [
  it({ id: 'ENI.MI', name: 'Eni', hint: 'Energia · FTSE MIB', sector: 'Energia' }),
  it({ id: 'ISP.MI', name: 'Intesa Sanpaolo', hint: 'Banca · FTSE MIB', sector: 'Finanza' }),
  it({ id: 'UCG.MI', name: 'UniCredit', hint: 'Banca · FTSE MIB', sector: 'Finanza' }),
  it({ id: 'ENEL.MI', name: 'Enel', hint: 'Utility · FTSE MIB', sector: 'Utility' }),
  it({ id: 'STM.MI', name: 'STMicroelectronics', hint: 'Semiconduttori · FTSE MIB', sector: 'Tech' }),
  it({ id: 'RACE.MI', name: 'Ferrari', hint: 'Auto · FTSE MIB', sector: 'Auto' }),
  it({ id: 'G.MI', name: 'Generali', hint: 'Assicurazioni · FTSE MIB', sector: 'Finanza' }),
  it({ id: 'LDO.MI', name: 'Leonardo', hint: 'Difesa · FTSE MIB', sector: 'Industriale' }),
  it({ id: 'TEN.MI', name: 'Tenaris', hint: 'Acciaio · FTSE MIB', sector: 'Industriale' }),
  it({ id: 'PRY.MI', name: 'Prysmian', hint: 'Cavi · FTSE MIB', sector: 'Industriale' }),
];

export const CRYPTO_SYMBOLS = [
  { ...coin, id: 'BTC-USD', name: 'Bitcoin', hint: 'Layer 1 · riserva di valore', family: 'Layer 1' },
  { ...coin, id: 'ETH-USD', name: 'Ethereum', hint: 'Smart contract · DeFi', family: 'Layer 1' },
  { ...coin, id: 'SOL-USD', name: 'Solana', hint: 'Alta velocità · DeFi/NFT', family: 'Layer 1' },
  { ...coin, id: 'XRP-USD', name: 'XRP', hint: 'Pagamenti cross-border', family: 'Pagamenti' },
  { ...coin, id: 'ADA-USD', name: 'Cardano', hint: 'Proof-of-stake', family: 'Layer 1' },
  { ...coin, id: 'BNB-USD', name: 'BNB', hint: 'Exchange · BNB Chain', family: 'Exchange' },
  { ...coin, id: 'DOGE-USD', name: 'Dogecoin', hint: 'Meme · pagamenti social', family: 'Meme' },
  { ...coin, id: 'DOT-USD', name: 'Polkadot', hint: 'Interoperabilità · parachain', family: 'Layer 0' },
];

export const PRECIOUS_METAL_SYMBOLS = [
  {
    id: 'XAUUSD',
    name: 'Oro',
    family: 'Oro',
    hint: 'Spot oro · prezzo al grammo',
    pricingKind: 'perGramTroy',
    unit: 'USD/oncia troy',
  },
  {
    id: 'XAGUSD',
    name: 'Argento',
    family: 'Argento',
    hint: 'Spot argento · prezzo al grammo',
    pricingKind: 'perGramTroy',
    unit: 'USD/oncia troy',
  },
  {
    id: 'XPTUSD',
    name: 'Platino',
    family: 'Platino',
    hint: 'Spot platino · prezzo al grammo',
    pricingKind: 'perGramTroy',
    unit: 'USD/oncia troy',
  },
  {
    id: 'XPDUSD',
    name: 'Palladio',
    family: 'Palladio',
    hint: 'Spot palladio · prezzo al grammo',
    pricingKind: 'perGramTroy',
    unit: 'USD/oncia troy',
  },
];

export const COMMODITY_METAL_SYMBOLS = [
  {
    id: 'WTI',
    name: 'Petrolio WTI',
    family: 'Energia',
    hint: 'Futures petrolio — quotazione al barile',
    pricingKind: 'perBarrel',
    unit: 'USD/barile',
  },
  {
    id: 'COPPER',
    name: 'Rame',
    family: 'Industriale',
    hint: 'Futures rame — prezzo al grammo da libbra',
    pricingKind: 'perGramLb',
    unit: 'USD/libbra',
  },
];

export const METAL_SYMBOLS = [...PRECIOUS_METAL_SYMBOLS, ...COMMODITY_METAL_SYMBOLS];

export function getSymbolsForType(type) {
  if (type === 'stock') return STOCK_SYMBOLS;
  if (type === 'national') return NATIONAL_STOCKS;
  if (type === 'crypto') return CRYPTO_SYMBOLS;
  if (type === 'commodity') return COMMODITY_METAL_SYMBOLS;
  if (type === 'precious' || type === 'metal') return PRECIOUS_METAL_SYMBOLS;
  return STOCK_SYMBOLS;
}

export function getSymbolMeta(id, type) {
  const list = getSymbolsForType(type);
  return (
    list.find((s) => s.id === id) ?? {
      id,
      name: id,
      hint: '',
      pricingKind:
        type === 'stock' || type === 'national'
          ? 'perShare'
          : type === 'crypto'
            ? 'perCoin'
            : 'perGramTroy',
    }
  );
}

export function symbolIdsForType(type) {
  return getSymbolsForType(type).map((s) => s.id);
}

export function isPreciousMarketType(type) {
  return type === 'precious' || type === 'metal';
}

export function isEquityMarketType(type) {
  return type === 'stock' || type === 'national';
}
