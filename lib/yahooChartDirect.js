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

async function requestChartCurl(host, yahooSymbol, range) {
  const url = `${host}/${encodeURIComponent(yahooSymbol)}?interval=1d&range=${encodeURIComponent(range)}`;
  const { stdout } = await execFileAsync('curl', [
    '-sL',
    '-m',
    '25',
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

async function requestChart(host, yahooSymbol, range) {
  return requestChartCurl(host, yahooSymbol, range);
}

export async function fetchYahooChartDirect(yahooSymbol, range = '6mo') {
  let lastErr;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(3000);
    try {
      const data = await requestChart(CHART_HOST, yahooSymbol, range);
      return parseChartResponse(data);
    } catch (err) {
      lastErr = err;
      if (!isRateLimited(err)) throw err;
    }
  }

  throw lastErr ?? new Error('Yahoo chart non disponibile');
}

function parseChartResponse(data) {

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('Risposta Yahoo chart non valida');

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  const series = timestamps
    .map((ts, i) => {
      const close = closes[i];
      if (close == null || Number.isNaN(close)) return null;
      return { date: formatChartDate(ts), price: close };
    })
    .filter(Boolean);

  if (!series.length) throw new Error('Serie Yahoo vuota');

  const meta = result.meta || {};
  const lastBar = series[series.length - 1];
  const prevClose = meta.chartPreviousClose ?? meta.previousClose;
  const price = meta.regularMarketPrice ?? lastBar.price;
  const change = prevClose != null ? price - prevClose : null;

  return {
    series,
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
