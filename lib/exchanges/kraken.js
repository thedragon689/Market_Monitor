import axios from 'axios';

const REST = 'https://api.kraken.com/0/public';

export async function fetchKrakenTicker(pair = 'XBTUSD') {
  const { data } = await axios.get(`${REST}/Ticker`, {
    params: { pair },
    timeout: 12_000,
    headers: { Accept: 'application/json' },
  });

  if (data.error?.length) {
    throw new Error(`Kraken: ${data.error.join(', ')}`);
  }

  const key = Object.keys(data.result || {})[0];
  if (!key) throw new Error('Kraken: nessun dato ticker');

  const t = data.result[key];
  const last = parseFloat(t.c[0]);
  const open = parseFloat(t.o);
  const change = Number.isFinite(open) ? last - open : null;
  const changePercent =
    open && Number.isFinite(change) ? Number(((change / open) * 100).toFixed(4)) : null;

  return {
    symbol: 'BTC-USD',
    krakenPair: key,
    price: last,
    currency: 'USD',
    change,
    changePercent,
    asOf: new Date().toISOString().slice(0, 10),
    source: 'kraken',
  };
}

/** OHLC giornaliero (interval in minuti, 1440 = 1 giorno). */
export async function fetchKrakenOHLC(pair = 'XBTUSD', interval = 1440) {
  const { data } = await axios.get(`${REST}/OHLC`, {
    params: { pair, interval },
    timeout: 15_000,
    headers: { Accept: 'application/json' },
  });

  if (data.error?.length) {
    throw new Error(`Kraken: ${data.error.join(', ')}`);
  }

  const key = Object.keys(data.result || {}).find((k) => k !== 'last');
  const rows = key ? data.result[key] : [];

  return rows
    .map((r) => ({
      date: new Date(r[0] * 1000).toISOString().slice(0, 10),
      price: parseFloat(r[4]),
    }))
    .filter((p) => Number.isFinite(p.price));
}
