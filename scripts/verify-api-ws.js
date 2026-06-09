#!/usr/bin/env node
/**
 * Verifica allineamento frontend ↔ API e connettività WebSocket crypto.
 * Uso: node scripts/verify-api-ws.js [baseUrl]
 * Default: http://localhost:4000
 */
const base = (process.argv[2] || 'http://localhost:4000').replace(/\/$/, '');

let failed = 0;
let passed = 0;

function ok(msg) {
  passed += 1;
  console.log('OK:', msg);
}

function fail(msg) {
  failed += 1;
  console.error('FAIL:', msg);
}

async function get(path, { expectStatus = 200, label = path } = {}) {
  const url = `${base}${path}`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    fail(`${label} — rete: ${err.message}`);
    return null;
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    fail(`${label} — risposta non JSON (${res.status})`);
    return null;
  }
  if (res.status !== expectStatus) {
    fail(`${label} — status ${res.status} (atteso ${expectStatus}): ${data?.error || ''}`);
    return null;
  }
  return data;
}

function hasKeys(obj, keys, label) {
  const missing = keys.filter((k) => obj?.[k] == null);
  if (missing.length) {
    fail(`${label} — campi mancanti: ${missing.join(', ')}`);
    return false;
  }
  ok(`${label} — campi ${keys.join(', ')}`);
  return true;
}

async function testRestApi() {
  console.log('\n── REST API ──\n');

  const health = await get('/api/health', { label: 'GET /api/health' });
  if (health?.ok) ok('health ok=true');

  const sources = await get('/api/sources');
  if (sources) hasKeys(sources, ['categories'], 'sources');

  const catalog = await get('/api/catalog');
  if (catalog) hasKeys(catalog, ['catalog', 'summary'], 'catalog');

  const market = await get('/api/market?symbol=AAPL&type=stock&limit=90');
  if (market) hasKeys(market, ['quote', 'history', 'fx'], 'market AAPL');

  const quotes = await get('/api/quotes?symbols=AAPL,MSFT&type=stock');
  if (quotes) hasKeys(quotes, ['results', 'fx'], 'quotes batch');

  const bundle = await get(
    '/api/analysis-bundle?symbol=AAPL&type=stock&days=5&window=5&method=all'
  );
  if (bundle) {
    hasKeys(bundle, ['analysis', 'intelligence'], 'analysis-bundle');
    if (bundle.intelligence?.correlations) {
      ok('analysis-bundle — correlations in intelligence');
    }
  }

  const forecast = await get(
    '/api/forecast?symbol=AAPL&type=stock&days=5&window=5&method=both&geo=true'
  );
  if (forecast) {
    hasKeys(forecast, ['methods', 'horizonDays', 'lastPrice'], 'forecast');
    if (forecast.methods?.sma || forecast.methods?.linearRegression) {
      ok('forecast — metodi classici presenti');
    }
  }

  const intelligence = await get(
    '/api/intelligence?symbol=AAPL&type=stock&days=5&window=5&method=all&correlations=true'
  );
  if (intelligence) {
    hasKeys(intelligence, ['forecast', 'risk', 'correlations'], 'intelligence');
  }

  const news = await get('/api/geopolitical/news?limit=5');
  if (news) hasKeys(news, ['articles'], 'geo news');

  const advice = await get(
    '/api/trade-advice?symbol=AAPL&type=stock&days=5&window=5&method=all'
  );
  if (advice) hasKeys(advice, ['advice', 'hasForecast'], 'trade-advice');

  const commodity = await get(
    '/api/commodities/profile?symbol=XAUUSD&type=precious&days=5&window=20'
  );
  if (commodity) {
    hasKeys(commodity, ['symbol', 'profile', 'quote', 'futures', 'market', 'fx'], 'commodities/profile');
    if (commodity.profile?.name) ok(`commodities/profile — ${commodity.profile.name}`);
  }

  const badCommodityType = await get(
    '/api/commodities/profile?symbol=XAUUSD&type=stock',
    { expectStatus: 400, label: 'commodities/profile type invalido' }
  );
  if (badCommodityType?.error) ok('validazione type commodity');

  const btcLive = await get('/api/crypto/btc/live');
  if (btcLive) {
    hasKeys(btcLive, ['streams', 'updatedAt'], 'crypto/btc/live REST');
    if (btcLive.streams?.binance?.includes('wss://')) {
      ok('btc/live — URL WebSocket Binance in risposta');
    }
  }

  const bad = await get('/api/market', { expectStatus: 400, label: 'market senza symbol' });
  if (bad?.error) ok('validazione symbol obbligatorio');

  const badMethod = await get(
    '/api/forecast?symbol=AAPL&type=stock&method=invalid',
    { expectStatus: 400, label: 'forecast method invalido' }
  );
  if (badMethod?.error) ok('validazione method forecast');

  const missingRoute = await get('/api/nonexistent', {
    expectStatus: 404,
    label: 'route inesistente',
  });
  if (missingRoute?.error) ok('404 su endpoint sconosciuto');
}

async function getWebSocketCtor() {
  try {
    const { WebSocket } = await import('ws');
    return { WebSocket, kind: 'ws' };
  } catch {
    if (globalThis.WebSocket) return { WebSocket: globalThis.WebSocket, kind: 'native' };
    return null;
  }
}

function wsRawData(raw) {
  if (typeof raw === 'string') return raw;
  if (raw?.data != null) return wsRawData(raw.data);
  return raw?.toString?.() ?? String(raw);
}

function wsOnce(WebSocketCtor, url, { timeoutMs = 8000, onMessage, onOpen, kind = 'ws' } = {}) {
  return new Promise((resolve, reject) => {
    let ws;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      fn(value);
    };

    const timer = setTimeout(() => {
      finish(reject, new Error(`timeout ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      ws = new WebSocketCtor(url);
    } catch (err) {
      finish(reject, err);
      return;
    }

    const handleMessage = (raw) => {
      try {
        const result = onMessage?.(wsRawData(raw));
        if (result !== false) finish(resolve, result ?? true);
      } catch (err) {
        finish(reject, err);
      }
    };

    const handleError = (err) => {
      finish(reject, err instanceof Error ? err : new Error('WebSocket error'));
    };

    if (kind === 'ws' && typeof ws.on === 'function') {
      ws.on('open', () => onOpen?.(ws));
      ws.on('message', handleMessage);
      ws.on('error', handleError);
    } else {
      ws.onopen = () => onOpen?.(ws);
      ws.onmessage = (ev) => handleMessage(ev.data);
      ws.onerror = () => handleError(new Error('WebSocket error'));
    }
  });
}

async function testExchangeRestFallback() {
  const binance = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
  const bData = await binance.json();
  if (bData?.lastPrice) ok(`Binance REST BTC — price=${bData.lastPrice}`);
  else fail('Binance REST BTC — risposta invalida');

  const eth = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT');
  const eData = await eth.json();
  if (eData?.lastPrice) ok(`Binance REST ETH — price=${eData.lastPrice}`);
  else fail('Binance REST ETH — risposta invalida');
}

async function testWebSockets() {
  console.log('\n── WebSocket (crypto live) ──\n');

  const wsCtor = await getWebSocketCtor();
  if (!wsCtor) {
    console.log('SKIP: WebSocket non disponibile — verifica REST exchange');
    await testExchangeRestFallback();
    return;
  }

  const { WebSocket: WebSocketCtor, kind } = wsCtor;
  ok(`WebSocket client — ${kind === 'ws' ? 'pacchetto ws' : 'nativo'}`);

  const wsOpts = { kind };

  try {
    await wsOnce(WebSocketCtor, 'wss://stream.binance.com:9443/ws/btcusdt@ticker', {
      ...wsOpts,
      onMessage: (raw) => {
        const m = JSON.parse(raw);
        if (m.c && m.P) {
          ok(`Binance BTC ticker — price=${m.c}`);
          return true;
        }
        return false;
      },
    });
  } catch (err) {
    fail(`Binance BTC WS — ${err.message}`);
  }

  try {
    await wsOnce(WebSocketCtor, 'wss://stream.binance.com:9443/ws/ethusdt@ticker', {
      ...wsOpts,
      onMessage: (raw) => {
        const m = JSON.parse(raw);
        if (m.c) {
          ok(`Binance ETH ticker — price=${m.c}`);
          return true;
        }
        return false;
      },
    });
  } catch (err) {
    fail(`Binance ETH WS — ${err.message}`);
  }

  try {
    await wsOnce(WebSocketCtor, 'wss://ws.kraken.com', {
      ...wsOpts,
      timeoutMs: 12000,
      onOpen: (ws) => {
        ws.send(
          JSON.stringify({
            event: 'subscribe',
            pair: ['XBT/USD'],
            subscription: { name: 'ticker' },
          })
        );
      },
      onMessage: (raw) => {
        const m = JSON.parse(raw);
        if (Array.isArray(m) && m[1]?.c?.[0]) {
          ok(`Kraken XBT/USD ticker — price=${m[1].c[0]}`);
          return true;
        }
        return false;
      },
    });
  } catch (err) {
    fail(`Kraken BTC WS — ${err.message}`);
  }

  try {
    await wsOnce(WebSocketCtor, 'wss://ws.kraken.com', {
      ...wsOpts,
      timeoutMs: 12000,
      onOpen: (ws) => {
        ws.send(
          JSON.stringify({
            event: 'subscribe',
            pair: ['ETH/USD'],
            subscription: { name: 'ticker' },
          })
        );
      },
      onMessage: (raw) => {
        const m = JSON.parse(raw);
        if (Array.isArray(m) && m[1]?.c?.[0]) {
          ok(`Kraken ETH/USD ticker — price=${m[1].c[0]}`);
          return true;
        }
        return false;
      },
    });
  } catch (err) {
    fail(`Kraken ETH WS — ${err.message}`);
  }
}

console.log(`Verifica API + WS — base: ${base}`);
await testRestApi();
await testWebSockets();

console.log(`\nRisultato: ${passed} OK, ${failed} FAIL`);
if (failed) process.exit(1);
console.log('Tutte le verifiche API/WebSocket passate.');
