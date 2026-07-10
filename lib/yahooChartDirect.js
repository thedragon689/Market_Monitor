import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const CHART_HOST = 'https://query1.finance.yahoo.com/v8/finance/chart';

const CLIENT_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatChartDate(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function isRateLimited(err) {
  const status = err?.response?.status;
  const body = String(err?.response?.data ?? err?.message ?? '');
  return status === 429 || body.includes('Too Many');
}

async function requestChartCurl(host, yahooSymbol, range, interval = '1d') {
  const url = `${host}/${encodeURIComponent(yahooSymbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
  const { stdout } = await execFileAsync('curl', [
    '-sL',
    '-m',
    '12',
    '-H',
    `User-Agent: ${CLIENT_HEADERS['User-Agent']}`,
    '-H',
    'Accept: application/json',
    url,
  ]);

  const text = String(stdout || '').trim();
  if (!text || /too many requests/i.test(text) || text.startsWith('Edge:')) {
    const err = new Error('Yahoo rate limit');
    err.response = { status: 429, data: text };
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch {
    const err = new Error('Risposta Yahoo non valida');
    err.response = { status: 502, data: text.slice(0, 200) };
    throw err;
  }
}

async function requestChartFetch(host, yahooSymbol, range, interval = '1d') {
  const url = `${host}/${encodeURIComponent(yahooSymbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: CLIENT_HEADERS,
    signal: AbortSignal.timeout(12_000),
  });
  const text = await res.text();
  if (!res.ok || !text || /too many requests/i.test(text) || text.startsWith('Edge:')) {
    const err = new Error(res.ok ? 'Yahoo rate limit' : `Yahoo HTTP ${res.status}`);
    err.response = { status: res.status, data: text };
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error('Risposta Yahoo non valida');
    err.response = { status: 502, data: text.slice(0, 200) };
    throw err;
  }
}

async function requestChart(host, yahooSymbol, range, interval, { fetchOnly = false } = {}) {
  const allowCurl = process.env.YAHOO_ALLOW_CURL === '1';
  if (fetchOnly || !allowCurl) {
    return requestChartFetch(host, yahooSymbol, range, interval);
  }
  try {
    return await requestChartFetch(host, yahooSymbol, range, interval);
  } catch {
    return requestChartCurl(host, yahooSymbol, range, interval);
  }
}

export async function fetchYahooChartDirect(
  yahooSymbol,
  range = '6mo',
  interval = '1d',
  { fetchOnly = false } = {}
) {
  let lastErr;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(3000);
    try {
      const data = await requestChart(CHART_HOST, yahooSymbol, range, interval, { fetchOnly });
      return parseChartResponse(data, interval);
    } catch (err) {
      lastErr = err;
      if (!isRateLimited(err)) throw err;
    }
  }

  throw lastErr ?? new Error('Yahoo chart non disponibile');
}

function parseChartResponse(data, interval = '1d') {
  const intraday = interval !== '1d' && interval !== '1wk' && interval !== '1mo';

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('Risposta Yahoo chart non valida');

  const timestamps = result.timestamp || [];
  const quote0 = result.indicators?.quote?.[0] || {};
  const closes = quote0.close || [];
  const opens = quote0.open || [];
  const highs = quote0.high || [];
  const lows = quote0.low || [];
  const volumes = quote0.volume || [];

  const series = [];
  const ohlc = [];
  timestamps.forEach((ts, i) => {
    const close = closes[i];
    if (close == null || Number.isNaN(close)) return;
    const date = formatChartDate(ts);
    // Intraday: tempo in secondi UNIX (lightweight-charts UTCTimestamp).
    // Daily/weekly: business day 'YYYY-MM-DD'.
    const time = intraday ? ts : date;
    series.push({ date, time, price: close });
    const open = opens[i];
    const high = highs[i];
    const low = lows[i];
    // Candela valida solo con OHLC completo; altrimenti si ripiega sul close.
    ohlc.push({
      date,
      time,
      open: open != null && !Number.isNaN(open) ? open : close,
      high: high != null && !Number.isNaN(high) ? high : close,
      low: low != null && !Number.isNaN(low) ? low : close,
      close,
      volume: volumes[i] != null && !Number.isNaN(volumes[i]) ? volumes[i] : null,
    });
  });

  if (!series.length) throw new Error('Serie Yahoo vuota');

  const meta = result.meta || {};
  const lastBar = series[series.length - 1];
  const prevClose = meta.chartPreviousClose ?? meta.previousClose;
  const price = meta.regularMarketPrice ?? lastBar.price;
  const change = prevClose != null ? price - prevClose : null;

  return {
    series,
    ohlc,
    meta,
    lastBar,
    quote: {
      price,
      currency: meta.currency || 'USD',
      change,
      changePercent:
        change != null && prevClose
          ? ((change / prevClose) * 100).toFixed(4)
          : null,
      asOf: lastBar.date,
      // Statistiche giornaliere (KPI analisi) — presenti solo se Yahoo le fornisce.
      volume: meta.regularMarketVolume ?? null,
      dayHigh: meta.regularMarketDayHigh ?? null,
      dayLow: meta.regularMarketDayLow ?? null,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    },
  };
}
