/** Indici, Forex, ETF, volatilità, tassi, macro, sentiment — sync lib/*Registry.js */

const index = { pricingKind: 'perIndex' };
const pair = { pricingKind: 'perPair' };
const share = { pricingKind: 'perShare', unit: 'USD' };
const yieldKind = { pricingKind: 'perYield', unit: '%' };

export const INDEX_SYMBOLS = [
  { ...index, id: '^GSPC', name: 'S&P 500', hint: 'USA · large cap', region: 'USA', unit: 'punti' },
  { ...index, id: '^IXIC', name: 'Nasdaq Composite', hint: 'USA · tech-heavy', region: 'USA', unit: 'punti' },
  { ...index, id: '^DJI', name: 'Dow Jones', hint: 'USA · 30 titoli', region: 'USA', unit: 'punti' },
  { ...index, id: '^FTSE', name: 'FTSE 100', hint: 'Regno Unito', region: 'UK', unit: 'punti' },
  { ...index, id: '^GDAXI', name: 'DAX', hint: 'Germania', region: 'EU', unit: 'punti' },
  { ...index, id: '^FCHI', name: 'CAC 40', hint: 'Francia', region: 'EU', unit: 'punti' },
  { ...index, id: '^STOXX50E', name: 'Euro Stoxx 50', hint: 'Eurozona', region: 'EU', unit: 'punti' },
  { ...index, id: '^N225', name: 'Nikkei 225', hint: 'Giappone', region: 'Asia', unit: 'punti' },
  { ...index, id: '^HSI', name: 'Hang Seng', hint: 'Hong Kong', region: 'Asia', unit: 'punti' },
];

export const FOREX_SYMBOLS = [
  { ...pair, id: 'EURUSD', name: 'EUR/USD', hint: 'Euro / Dollaro', unit: 'USD per EUR' },
  { ...pair, id: 'GBPUSD', name: 'GBP/USD', hint: 'Sterlina / Dollaro', unit: 'USD per GBP' },
  { ...pair, id: 'USDJPY', name: 'USD/JPY', hint: 'Dollaro / Yen', unit: 'JPY per USD' },
  { ...pair, id: 'USDCHF', name: 'USD/CHF', hint: 'Dollaro / Franco', unit: 'CHF per USD' },
  { ...pair, id: 'AUDUSD', name: 'AUD/USD', hint: 'Dollaro australiano', unit: 'USD per AUD' },
  { ...pair, id: 'USDCAD', name: 'USD/CAD', hint: 'Dollaro / CAD', unit: 'CAD per USD' },
  { ...pair, id: 'NZDUSD', name: 'NZD/USD', hint: 'Dollaro neozelandese', unit: 'USD per NZD' },
  { ...pair, id: 'EURGBP', name: 'EUR/GBP', hint: 'Euro / Sterlina', unit: 'GBP per EUR' },
  { ...pair, id: 'EURJPY', name: 'EUR/JPY', hint: 'Euro / Yen', unit: 'JPY per EUR' },
];

export const ETF_SYMBOLS = [
  { ...share, id: 'SPY', name: 'SPDR S&P 500', hint: 'Large cap USA', sector: 'Broad' },
  { ...share, id: 'QQQ', name: 'Invesco QQQ', hint: 'Nasdaq 100', sector: 'Tech' },
  { ...share, id: 'IWM', name: 'Russell 2000', hint: 'Small cap USA', sector: 'Broad' },
  { ...share, id: 'VTI', name: 'Vanguard Total Stock', hint: 'Mercato USA totale', sector: 'Broad' },
  { ...share, id: 'EFA', name: 'iShares MSCI EAFE', hint: 'Sviluppati ex-USA', sector: 'International' },
  { ...share, id: 'EEM', name: 'iShares MSCI Emerging', hint: 'Emergenti', sector: 'EM' },
  { ...share, id: 'GLD', name: 'SPDR Gold Shares', hint: 'Oro fisico', sector: 'Commodity' },
  { ...share, id: 'SLV', name: 'iShares Silver', hint: 'Argento fisico', sector: 'Commodity' },
  { ...share, id: 'USO', name: 'United States Oil', hint: 'Petrolio WTI', sector: 'Energy' },
  { ...share, id: 'XLE', name: 'Energy Select SPDR', hint: 'Settore energia', sector: 'Energy' },
  { ...share, id: 'XLK', name: 'Technology Select SPDR', hint: 'Settore tech', sector: 'Tech' },
  { ...share, id: 'XLF', name: 'Financial Select SPDR', hint: 'Settore finanziario', sector: 'Financial' },
  { ...share, id: 'XLV', name: 'Health Care Select SPDR', hint: 'Sanità', sector: 'Health' },
  { ...share, id: 'XLI', name: 'Industrial Select SPDR', hint: 'Industriale', sector: 'Industrial' },
  { ...share, id: 'XLP', name: 'Consumer Staples SPDR', hint: 'Beni prima necessità', sector: 'Staples' },
  { ...share, id: 'XLY', name: 'Consumer Disc. SPDR', hint: 'Beni discrezionali', sector: 'Consumer' },
  { ...share, id: 'XLB', name: 'Materials Select SPDR', hint: 'Materie prime', sector: 'Materials' },
  { ...share, id: 'XLU', name: 'Utilities Select SPDR', hint: 'Utility', sector: 'Utilities' },
];

export const VOLATILITY_SYMBOLS = [
  { ...index, id: '^VIX', name: 'VIX', hint: 'Volatilità implicita S&P 500', unit: 'punti' },
  { ...index, id: '^VVIX', name: 'VVIX', hint: 'Volatilità del VIX', unit: 'punti' },
  { ...index, id: '^SKEW', name: 'SKEW', hint: 'Rischio tail', unit: 'punti' },
  { ...share, id: 'VXX', name: 'VXX', hint: 'ETN volatilità breve' },
];

export const RATES_SYMBOLS = [
  { ...yieldKind, id: '^TNX', name: 'US 10Y Yield', hint: 'Treasury 10 anni' },
  { ...yieldKind, id: '^FVX', name: 'US 5Y Yield', hint: 'Treasury 5 anni' },
  { ...yieldKind, id: '^TYX', name: 'US 30Y Yield', hint: 'Treasury 30 anni' },
  { ...share, id: 'TLT', name: 'iShares 20+ Year Treasury', hint: 'ETF Treasury long' },
  { ...share, id: 'IEF', name: 'iShares 7-10 Year Treasury', hint: 'ETF Treasury medio' },
  { ...share, id: 'SHY', name: 'iShares 1-3 Year Treasury', hint: 'ETF Treasury breve' },
  { ...share, id: 'LQD', name: 'iShares IG Corporate', hint: 'Investment grade' },
  { ...share, id: 'HYG', name: 'iShares High Yield', hint: 'High yield' },
];

export const MACRO_SYMBOLS = [
  { ...index, id: 'DX-Y.NYB', name: 'US Dollar Index', hint: 'DXY · dollaro', unit: 'punti' },
  { ...share, id: 'TIP', name: 'iShares TIPS', hint: 'Proxy inflazione CPI' },
  { ...share, id: 'RINF', name: 'ProShares Inflation Expectations', hint: 'Aspettative inflazione PPI/CPI' },
  { ...share, id: 'UUP', name: 'Invesco DB USD Index', hint: 'ETF dollaro' },
  { ...share, id: 'CPER', name: 'United States Copper', hint: 'Domanda industriale' },
  { ...share, id: 'DBC', name: 'Invesco DB Commodity', hint: 'Paniere commodities' },
];

export const SENTIMENT_SYMBOLS = [
  { ...index, id: '^VIX', name: 'VIX · Fear gauge', hint: 'Paura di mercato', unit: 'punti' },
  { ...share, id: 'HYG', name: 'High Yield · Risk appetite', hint: 'Appetito al rischio' },
  { ...share, id: 'IWM', name: 'Russell 2000', hint: 'Risk-on small cap' },
  { ...share, id: 'ARKK', name: 'ARK Innovation', hint: 'Sentiment growth tech' },
  { ...share, id: 'GLD', name: 'Gold · Safe haven', hint: 'Rifugio sicuro' },
];

export const EXTRA_CRYPTO_SYMBOLS = [
  { pricingKind: 'perCoin', unit: 'USD/coin', id: 'LINK-USD', name: 'Chainlink', hint: 'Oracle · DeFi', family: 'Infrastructure' },
  { pricingKind: 'perCoin', unit: 'USD/coin', id: 'AVAX-USD', name: 'Avalanche', hint: 'Layer 1', family: 'Layer 1' },
  { pricingKind: 'perCoin', unit: 'USD/coin', id: 'MATIC-USD', name: 'Polygon', hint: 'Layer 2', family: 'Layer 2' },
  { pricingKind: 'perCoin', unit: 'USD/coin', id: 'LTC-USD', name: 'Litecoin', hint: 'Pagamenti', family: 'Payments' },
  { pricingKind: 'perCoin', unit: 'USD/coin', id: 'UNI-USD', name: 'Uniswap', hint: 'DeFi DEX', family: 'DeFi' },
  { pricingKind: 'perCoin', unit: 'USD/coin', id: 'ATOM-USD', name: 'Cosmos', hint: 'Interchain', family: 'Layer 0' },
  { pricingKind: 'perCoin', unit: 'USD/coin', id: 'SHIB-USD', name: 'Shiba Inu', hint: 'Meme', family: 'Meme' },
];
