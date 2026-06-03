import axios from 'axios';

const FCS_BASE = 'https://api-v4.fcsapi.com';

const COMMODITY_SYMBOLS = {
  XAUUSD: 'XAUUSD',
  XAU: 'XAUUSD',
  XAGUSD: 'SILVER',
  XAG: 'SILVER',
  WTI: 'OSX',
  COPPER: 'COPPER',
};

function pickFcsKey() {
  const key = process.env.FCSALE_API_KEY;
  if (key && !key.startsWith('LA_TUA') && !key.startsWith('your_')) return key;
  return null;
}

function parseFcsHistory(response) {
  if (!response || typeof response !== 'object') return [];

  return Object.values(response)
    .map((bar) => {
      const close = parseFloat(bar.c);
      const date = bar.tm?.slice(0, 10);
      if (!date || !Number.isFinite(close)) return null;
      return { date, price: close };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchFcsMetalSeries(displaySymbol) {
  const apiKey = pickFcsKey();
  if (!apiKey) return null;

  const key = displaySymbol.toUpperCase().replace(/[^A-Z]/g, '');
  const fcsSymbol = COMMODITY_SYMBOLS[key] || COMMODITY_SYMBOLS[displaySymbol.toUpperCase()];
  if (!fcsSymbol) return null;

  const { data } = await axios.get(`${FCS_BASE}/forex/history`, {
    params: {
      symbol: fcsSymbol,
      period: '1D',
      type: 'commodity',
      length: 120,
      access_key: apiKey,
    },
    timeout: 20_000,
  });

  if (!data?.status || !data.response) {
    const msg = data?.msg || 'FCS API non disponibile';
    throw new Error(msg);
  }

  const history = parseFcsHistory(data.response);
  if (!history.length) return null;

  return { history, resolvedSymbol: fcsSymbol };
}
