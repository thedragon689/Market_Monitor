import { loadMarketData } from '../yahoo.js';

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 8) return null;
  const x = a.slice(-n);
  const y = b.slice(-n);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = x[i] - mx;
    const vy = y[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  return den ? num / den : null;
}

/** Benchmark macro sempre calcolati per contesto di mercato. */
const MACRO_PAIRS = [
  {
    id: 'spy_vix',
    a: 'SPY',
    b: '^VIX',
    label: 'S&P500 ↔ VIX',
    typeA: 'stock',
    typeB: 'stock',
    group: 'macro',
    role: 'Rischio sistemico',
  },
  {
    id: 'qqq_tlt',
    a: 'QQQ',
    b: 'TLT',
    label: 'Nasdaq ↔ Bond (TLT)',
    typeA: 'stock',
    typeB: 'stock',
    group: 'macro',
    role: 'Tech vs tassi',
  },
  {
    id: 'gold_dollar',
    a: 'XAUUSD',
    b: 'DX-Y.NYB',
    label: 'Oro ↔ Dollaro',
    typeA: 'precious',
    typeB: 'stock',
    group: 'macro',
    role: 'Refugio vs USD',
  },
  {
    id: 'oil_gold',
    a: 'WTI',
    b: 'XAUUSD',
    label: 'Petrolio ↔ Oro',
    typeA: 'commodity',
    typeB: 'precious',
    group: 'macro',
    role: 'Commodity vs safe haven',
  },
  {
    id: 'silver_gold',
    a: 'XAGUSD',
    b: 'XAUUSD',
    label: 'Argento ↔ Oro',
    typeA: 'precious',
    typeB: 'precious',
    group: 'macro',
    role: 'Metalli preziosi',
  },
  {
    id: 'copper_spy',
    a: 'COPPER',
    b: 'SPY',
    label: 'Rame ↔ S&P500',
    typeA: 'commodity',
    typeB: 'stock',
    group: 'macro',
    role: 'Ciclo industriale',
  },
];

function pairKey(a, b) {
  return [String(a).toUpperCase(), String(b).toUpperCase()].sort().join('|');
}

/** Parametri di confronto per l'asset selezionato. */
export function buildAssetComparisonPairs(symbol, type) {
  const sym = String(symbol).toUpperCase();
  const pairs = [];

  const push = (id, a, b, label, typeA, typeB, group, role) => {
    pairs.push({ id, a, b, label, typeA, typeB, group, role });
  };

  if (type === 'stock' || type === 'national') {
    push(`${sym}_spy`, sym, 'SPY', `${sym} ↔ S&P500 (SPY)`, type, 'stock', 'asset', 'Beta di mercato');
    push(`${sym}_qqq`, sym, 'QQQ', `${sym} ↔ Nasdaq (QQQ)`, type, 'stock', 'asset', 'Esposizione growth');
    push(`${sym}_gold`, sym, 'XAUUSD', `${sym} ↔ Oro`, type, 'precious', 'asset', 'Correlazione safe haven');
    push(`${sym}_vix`, sym, '^VIX', `${sym} ↔ VIX`, type, 'stock', 'asset', 'Sensibilità al rischio');
  } else if (type === 'crypto') {
    if (sym !== 'BTC-USD') {
      push(`${sym}_btc`, sym, 'BTC-USD', `${sym} ↔ Bitcoin`, 'crypto', 'crypto', 'asset', 'Benchmark crypto');
    }
    if (sym !== 'ETH-USD') {
      push(`${sym}_eth`, sym, 'ETH-USD', `${sym} ↔ Ethereum`, 'crypto', 'crypto', 'asset', 'Layer 1 peer');
    }
    push(`${sym}_spy`, sym, 'SPY', `${sym} ↔ S&P500 (SPY)`, 'crypto', 'stock', 'asset', 'Risk-on / risk-off');
    push(`${sym}_gold`, sym, 'XAUUSD', `${sym} ↔ Oro`, 'crypto', 'precious', 'asset', 'Rifugio alternativo');
  } else if (type === 'precious') {
    push(`${sym}_spy`, sym, 'SPY', `${sym} ↔ Azionario (SPY)`, 'precious', 'stock', 'asset', 'Risk-on / risk-off');
    if (sym !== 'XAUUSD') {
      push(`${sym}_gold`, sym, 'XAUUSD', `${sym} ↔ Oro`, 'precious', 'precious', 'asset', 'Benchmark metallo');
    }
    if (sym !== 'XAGUSD') {
      push(`${sym}_silver`, sym, 'XAGUSD', `${sym} ↔ Argento`, 'precious', 'precious', 'asset', 'Peer metalli');
    }
    push(`${sym}_dxy`, sym, 'DX-Y.NYB', `${sym} ↔ Dollaro`, 'precious', 'stock', 'asset', 'Pressione valutaria');
  } else if (type === 'commodity') {
    push(`${sym}_spy`, sym, 'SPY', `${sym} ↔ S&P500 (SPY)`, 'commodity', 'stock', 'asset', 'Domanda globale');
    if (sym !== 'WTI') {
      push(`${sym}_wti`, sym, 'WTI', `${sym} ↔ Petrolio WTI`, 'commodity', 'commodity', 'asset', 'Energia');
    }
    if (sym !== 'COPPER') {
      push(`${sym}_copper`, sym, 'COPPER', `${sym} ↔ Rame`, 'commodity', 'commodity', 'asset', 'Industriale');
    }
    push(`${sym}_gold`, sym, 'XAUUSD', `${sym} ↔ Oro`, 'commodity', 'precious', 'asset', 'Inflazione / rifugio');
  }

  return pairs;
}

export function interpretCorrelation(corr) {
  if (corr == null || !Number.isFinite(corr)) {
    return { label: 'N/D', tone: 'neu', strength: 0 };
  }
  const abs = Math.abs(corr);
  let label;
  if (abs >= 0.7) label = corr > 0 ? 'Forte +' : 'Forte −';
  else if (abs >= 0.4) label = corr > 0 ? 'Moderata +' : 'Moderata −';
  else if (abs >= 0.2) label = corr > 0 ? 'Debole +' : 'Debole −';
  else label = 'Quasi nulla';

  const tone = corr > 0.3 ? 'pos' : corr < -0.3 ? 'neg' : 'neu';
  return { label, tone, strength: Number(abs.toFixed(3)) };
}

async function computePair(pair) {
  try {
    const [ra, rb] = await Promise.all([
      loadMarketData(pair.a, pair.typeA),
      loadMarketData(pair.b, pair.typeB),
    ]);
    const pa = ra.series.map((p) => p.price);
    const pb = rb.series.map((p) => p.price);
    const corr = pearson(pa, pb);
    const interpretation = interpretCorrelation(corr);

    return {
      id: pair.id,
      label: pair.label,
      symbolA: pair.a,
      symbolB: pair.b,
      group: pair.group,
      role: pair.role,
      correlation: corr != null ? Number(corr.toFixed(3)) : null,
      points: Math.min(pa.length, pb.length),
      interpretation: interpretation.label,
      tone: interpretation.tone,
      strength: interpretation.strength,
    };
  } catch (err) {
    return {
      id: pair.id,
      label: pair.label,
      symbolA: pair.a,
      symbolB: pair.b,
      group: pair.group,
      role: pair.role,
      correlation: null,
      interpretation: 'N/D',
      tone: 'neu',
      strength: 0,
      error: err.message,
    };
  }
}

/**
 * Calcola correlazioni macro + confronto sull'asset corrente.
 * Forzato per default: fornisce parametri di benchmark comparabili.
 */
export async function computeMarketCorrelations({ symbol, type } = {}) {
  const seen = new Set();
  const pairs = [];

  for (const pair of MACRO_PAIRS) {
    const key = pairKey(pair.a, pair.b);
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(pair);
  }

  if (symbol && type) {
    for (const pair of buildAssetComparisonPairs(symbol, type)) {
      const key = pairKey(pair.a, pair.b);
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push(pair);
    }
  }

  const results = await Promise.all(pairs.map(computePair));

  return {
    symbol: symbol ?? null,
    type: type ?? null,
    pairs: results,
    macro: results.filter((r) => r.group === 'macro'),
    asset: results.filter((r) => r.group === 'asset'),
    updatedAt: new Date().toISOString(),
  };
}

export function correlationHeatmapCells(correlations) {
  const list = Array.isArray(correlations)
    ? correlations
    : correlations?.pairs ?? [];

  return list.map((c) => ({
    id: c.id,
    label: c.label,
    value: c.correlation,
    intensity: c.strength ?? (c.correlation != null ? Math.abs(c.correlation) : 0),
    tone: c.tone ?? interpretCorrelation(c.correlation).tone,
    group: c.group,
    role: c.role,
    interpretation: c.interpretation,
  }));
}
