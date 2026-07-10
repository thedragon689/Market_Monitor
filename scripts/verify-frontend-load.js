#!/usr/bin/env node
/**
 * Verifica il flusso di caricamento usato dal frontend (bootstrap, market, batch, geo).
 * Uso: node scripts/verify-frontend-load.js [baseUrl]
 * Default: http://localhost:5173 (proxy Vite) — fallback :4000 se 5173 non risponde.
 */
const preferred = (process.argv[2] || 'http://localhost:5173').replace(/\/$/, '');
const fallback = 'http://localhost:4000';

let base = preferred;
let failed = 0;
let passed = 0;
const timings = [];

function ok(msg) {
  passed += 1;
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  failed += 1;
  console.error(`  ✗ ${msg}`);
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
}

async function timedFetch(path, { label = path, expectStatus = 200, optional = false } = {}) {
  const url = `${base}${path}`;
  const start = performance.now();
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  } catch (err) {
    if (optional) {
      warn(`${label} — skip (${err.message})`);
      return null;
    }
    fail(`${label} — rete: ${err.message}`);
    return null;
  }
  const ms = Math.round(performance.now() - start);
  timings.push({ label, ms, status: res.status });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (!optional) fail(`${label} — risposta non JSON (${res.status}, ${ms}ms)`);
    return null;
  }

  if (res.status !== expectStatus) {
    if (optional) {
      warn(`${label} — ${res.status} (${ms}ms), opzionale`);
      return data;
    }
    fail(`${label} — status ${res.status} (atteso ${expectStatus}, ${ms}ms): ${data?.error || ''}`);
    return null;
  }

  return { data, ms, res };
}

function checkQuote(data, label) {
  const price = data?.quote?.price ?? data?.market?.quote?.price;
  if (price == null || !Number.isFinite(Number(price))) {
    fail(`${label} — prezzo assente`);
    return false;
  }
  ok(`${label} — prezzo ${price} (${timings.find((t) => t.label === label)?.ms ?? '?'}ms)`);
  return true;
}

function checkHistory(data, label, min = 5) {
  const history = data?.history ?? data?.market?.history;
  const len = history?.length ?? 0;
  if (len < min) {
    fail(`${label} — storico insufficiente (${len} punti, min ${min})`);
    return false;
  }
  ok(`${label} — storico ${len} punti`);
  return true;
}

async function resolveBase() {
  try {
    const res = await fetch(`${preferred}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      base = preferred;
      ok(`Base URL: ${base} (proxy Vite)`);
      return;
    }
  } catch {
    /* try direct API */
  }
  try {
    const res = await fetch(`${fallback}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      base = fallback;
      warn(`Vite non raggiungibile — uso API diretta ${base}`);
      return;
    }
  } catch {
    /* fall through */
  }
  fail('Né :5173 né :4000 rispondono. Avvia: npm run dev');
  process.exit(1);
}

console.log('\n═══ Check caricamento frontend ═══\n');

await resolveBase();

console.log('\n── Avvio app (bootstrap) ──\n');
const boot = await timedFetch(
  '/api/bootstrap?symbol=WTI&type=commodity&limit=120',
  { label: 'bootstrap WTI' }
);
if (boot?.data) {
  if (boot.data.catalog && boot.data.summary) ok('bootstrap — catalog + summary');
  else fail('bootstrap — catalog/summary mancanti');
  checkQuote(boot.data, 'bootstrap WTI');
  checkHistory(boot.data.market ?? boot.data, 'bootstrap WTI', 2);
  if (boot.ms > 8000) warn(`bootstrap lento (${boot.ms}ms)`);
  else ok(`bootstrap tempo ${boot.ms}ms`);
}

console.log('\n── Cambio asset (market singolo) ──\n');
const market = await timedFetch('/api/market?symbol=AAPL&type=stock&limit=120', {
  label: 'market AAPL',
});
if (market?.data) {
  checkQuote(market.data, 'market AAPL');
  checkHistory(market.data, 'market AAPL', 10);
  if (market.data.fx?.eurUsd) ok('market — fx EUR/USD');
  else warn('market — fx assente');
  if (market.ms > 5000) warn(`market lento (${market.ms}ms)`);
  else ok(`market tempo ${market.ms}ms`);

  const market2 = await timedFetch('/api/market?symbol=AAPL&type=stock&limit=120', {
    label: 'market AAPL (cache)',
  });
  if (market2?.data && market2.ms < market.ms) {
    ok(`cache server — 2ª richiesta ${market2.ms}ms vs ${market.ms}ms`);
  } else if (market2?.data) {
    ok(`2ª richiesta market ${market2.ms}ms`);
  }
}

console.log('\n── Dashboard terminal (batch) ──\n');
const batch = await timedFetch(
  '/api/market/batch?items=index:^GSPC,index:^IXIC,index:^DJI&limit=90',
  { label: 'market/batch indici' }
);
if (batch?.data) {
  const n = batch.data.results?.length ?? 0;
  if (n >= 2) ok(`batch — ${n} serie`);
  else fail(`batch — risultati insufficienti (${n})`);
  const withHistory = (batch.data.results || []).filter((r) => r.history?.length >= 5).length;
  ok(`batch — ${withHistory}/${n} con storico utilizzabile`);
  if (batch.ms > 10000) warn(`batch lento (${batch.ms}ms)`);
  else ok(`batch tempo ${batch.ms}ms`);
}

console.log('\n── Parallelo mount (sources + geo + catalog) ──\n');
const [sources, geo, catalog] = await Promise.all([
  timedFetch('/api/sources', { label: 'sources', optional: true }),
  timedFetch('/api/geopolitical/news?limit=30', { label: 'geo news', optional: true }),
  timedFetch('/api/catalog', { label: 'catalog' }),
]);
if (sources?.data?.categories) ok('sources — categorie fonti');
if (geo?.data) {
  const articles = geo.data.articles ?? geo.data.news ?? [];
  if (articles.length) ok(`geo news — ${articles.length} articoli`);
  else warn('geo news — feed vuoto (verifica rete o feed RSS)');
}
if (catalog?.data?.catalog) {
  const types = Object.keys(catalog.data.catalog).length;
  ok(`catalog — ${types} categorie`);
}

console.log('\n── Analisi (post-market) ──\n');
const bundle = await timedFetch(
  '/api/analysis-bundle?symbol=WTI&type=commodity&days=5&window=5&method=all',
  { label: 'analysis-bundle WTI', optional: true }
);
if (bundle?.data?.analysis) {
  ok('analysis-bundle — analysis presente');
  if (bundle.data.analysis.indicators) ok('analysis-bundle — indicatori');
  if (bundle.data.intelligence) ok('analysis-bundle — intelligence');
  if (bundle.ms > 15000) warn(`analysis-bundle lento (${bundle.ms}ms)`);
  else ok(`analysis-bundle tempo ${bundle.ms}ms`);
}

console.log('\n── Riepilogo tempi ──\n');
for (const t of timings.sort((a, b) => b.ms - a.ms)) {
  const flag = t.ms > 8000 ? ' ⚠' : '';
  console.log(`  ${String(t.ms).padStart(5)}ms  ${t.label}${flag}`);
}

console.log(`\n═══ Risultato: ${passed} OK, ${failed} FAIL ═══\n`);
if (failed) process.exit(1);
