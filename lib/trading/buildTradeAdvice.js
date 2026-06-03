/**
 * Sintesi euristica acquisto / vendita / mantieni da analisi esistenti.
 * Non è consulenza finanziaria — solo aggregazione segnali già calcolati.
 */

const DISCLAIMER =
  'Indicazione automatica a scopo informativo. Non costituisce consulenza finanziaria né invito all’investimento. Valuta sempre rischio, orizzonte e diversificazione.';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pushSignal(signals, { id, category, label, direction, weight, detail }) {
  signals.push({
    id,
    category,
    label,
    direction,
    weight: clamp(weight, -3, 3),
    detail: detail || '',
  });
}

function scoreFromSignals(signals) {
  if (!signals.length) return 0;
  const total = signals.reduce((s, x) => s + x.weight, 0);
  return clamp(total, -12, 12);
}

function actionFromScore(score) {
  if (score >= 4) {
    return {
      action: 'buy',
      actionLabel: 'Orientamento acquisto',
      tone: 'buy',
    };
  }
  if (score >= 1.5) {
    return {
      action: 'accumulate',
      actionLabel: 'Leggero orientamento acquisto',
      tone: 'buy-soft',
    };
  }
  if (score <= -4) {
    return {
      action: 'sell',
      actionLabel: 'Orientamento vendita',
      tone: 'sell',
    };
  }
  if (score <= -1.5) {
    return {
      action: 'reduce',
      actionLabel: 'Leggero orientamento vendita',
      tone: 'sell-soft',
    };
  }
  return {
    action: 'hold',
    actionLabel: 'Mantieni / attendi',
    tone: 'hold',
  };
}

function technicalSignals(analysis, lastPrice) {
  const signals = [];
  const ind = analysis?.indicators;
  if (!ind || lastPrice == null) return signals;

  const rsi = ind.rsi14;
  if (rsi != null) {
    if (rsi <= 30) {
      pushSignal(signals, {
        id: 'rsi-oversold',
        category: 'technical',
        label: 'RSI ipervenduto',
        direction: 'bull',
        weight: 2,
        detail: `RSI(14) = ${rsi.toFixed(1)} — possibile rimbalzo tecnico.`,
      });
    } else if (rsi >= 70) {
      pushSignal(signals, {
        id: 'rsi-overbought',
        category: 'technical',
        label: 'RSI ipercomprato',
        direction: 'bear',
        weight: -2,
        detail: `RSI(14) = ${rsi.toFixed(1)} — pressione di take-profit.`,
      });
    } else {
      pushSignal(signals, {
        id: 'rsi-neutral',
        category: 'technical',
        label: 'RSI neutrale',
        direction: 'neutral',
        weight: 0,
        detail: `RSI(14) = ${rsi.toFixed(1)}.`,
      });
    }
  }

  const macd = ind.macd;
  if (macd?.histogram != null) {
    const h = macd.histogram;
    pushSignal(signals, {
      id: 'macd-hist',
      category: 'technical',
      label: h > 0 ? 'MACD rialzista' : 'MACD ribassista',
      direction: h > 0 ? 'bull' : 'bear',
      weight: h > 0 ? 1.5 : -1.5,
      detail: `Istogramma ${h.toFixed(4)}.`,
    });
  }

  if (ind.sma20 != null && lastPrice) {
    const above = lastPrice > ind.sma20;
    pushSignal(signals, {
      id: 'sma20',
      category: 'technical',
      label: above ? 'Prezzo sopra SMA20' : 'Prezzo sotto SMA20',
      direction: above ? 'bull' : 'bear',
      weight: above ? 1 : -1,
      detail: `Prezzo ${lastPrice.toFixed(2)} vs SMA20 ${ind.sma20.toFixed(2)}.`,
    });
  }

  const bb = ind.bollinger;
  if (bb && lastPrice) {
    if (lastPrice >= bb.upper * 0.995) {
      pushSignal(signals, {
        id: 'bb-upper',
        category: 'technical',
        label: 'Banda di Bollinger superiore',
        direction: 'bear',
        weight: -1.5,
        detail: 'Prezzo presso resistenza statistica.',
      });
    } else if (lastPrice <= bb.lower * 1.005) {
      pushSignal(signals, {
        id: 'bb-lower',
        category: 'technical',
        label: 'Banda di Bollinger inferiore',
        direction: 'bull',
        weight: 1.5,
        detail: 'Prezzo presso supporto statistico.',
      });
    }
  }

  const lr = analysis?.forecast?.logReturn;
  if (lr?.nextPrice != null && lastPrice) {
    const delta = ((lr.nextPrice - lastPrice) / lastPrice) * 100;
    if (Math.abs(delta) >= 0.15) {
      pushSignal(signals, {
        id: 'log-return-1d',
        category: 'technical',
        label: delta > 0 ? 'Previsione 1g rialzista' : 'Previsione 1g ribassista',
        direction: delta > 0 ? 'bull' : 'bear',
        weight: delta > 0 ? 1 : -1,
        detail: `Stima log-return: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%.`,
      });
    }
  }

  return signals;
}

function intelligenceSignals(intelligence) {
  const signals = [];
  if (!intelligence) return signals;

  const regime = intelligence.regime;
  if (regime?.regime) {
    const map = {
      bull: { w: 2, dir: 'bull', label: 'Regime rialzista' },
      bear: { w: -2, dir: 'bear', label: 'Regime ribassista' },
      high_volatility: { w: -1, dir: 'bear', label: 'Alta volatilità' },
      crisis: { w: -2, dir: 'bear', label: 'Regime crisi' },
      sideways: { w: 0, dir: 'neutral', label: 'Mercato laterale' },
    };
    const r = map[regime.regime] || map.sideways;
    pushSignal(signals, {
      id: 'regime',
      category: 'regime',
      label: regime.label || r.label,
      direction: r.dir,
      weight: r.w,
      detail: `Confidenza regime ${((regime.confidence ?? 0) * 100).toFixed(0)}%.`,
    });
  }

  const geoIdx = intelligence.geopolitical?.index ?? intelligence.geopolitical?.impactScore?.index;
  if (geoIdx != null) {
    pushSignal(signals, {
      id: 'geo-impact',
      category: 'geopolitical',
      label: geoIdx >= 2 ? 'Contesto geo favorevole' : geoIdx <= -2 ? 'Contesto geo avverso' : 'Geo neutro',
      direction: geoIdx >= 2 ? 'bull' : geoIdx <= -2 ? 'bear' : 'neutral',
      weight: geoIdx >= 3 ? 1.5 : geoIdx <= -3 ? -1.5 : 0,
      detail: `Indice impatto geopolitico: ${Number(geoIdx).toFixed(1)}.`,
    });
  }

  const sent = intelligence.geopolitical?.sentiment?.average;
  if (sent != null && Math.abs(sent) > 0.15) {
    pushSignal(signals, {
      id: 'news-sentiment',
      category: 'geopolitical',
      label: sent > 0 ? 'Sentiment news positivo' : 'Sentiment news negativo',
      direction: sent > 0 ? 'bull' : 'bear',
      weight: sent > 0 ? 1 : -1,
      detail: `Media sentiment: ${sent.toFixed(2)}.`,
    });
  }

  const hybrid = intelligence.hybrid;
  const hybridPrice = hybrid?.combined ?? hybrid?.forecasts?.[0]?.price;
  if (hybridPrice != null && intelligence.lastPrice) {
    const hybridDelta =
      ((hybridPrice - intelligence.lastPrice) / intelligence.lastPrice) * 100;
    if (Math.abs(hybridDelta) >= 0.2) {
      pushSignal(signals, {
        id: 'hybrid',
        category: 'ml',
        label:
          hybridDelta > 0 ? 'Modello ibrido rialzista' : 'Modello ibrido ribassista',
        direction: hybridDelta > 0 ? 'bull' : 'bear',
        weight:
          hybridDelta > 1.5 ? 1.5 : hybridDelta < -1.5 ? -1.5 : hybridDelta > 0 ? 1 : -1,
        detail: `Prezzo ibrido stimato vs attuale: ${hybridDelta >= 0 ? '+' : ''}${hybridDelta.toFixed(2)}%.`,
      });
    }
  }

  const risk = intelligence.risk;
  if (risk?.atr?.pctOfPrice != null && risk.atr.pctOfPrice > 3.5) {
    pushSignal(signals, {
      id: 'high-atr',
      category: 'risk',
      label: 'Volatilità elevata (ATR)',
      direction: 'bear',
      weight: -1,
      detail: `ATR ${risk.atr.pctOfPrice.toFixed(1)}% del prezzo — riduci size.`,
    });
  }

  for (const alert of intelligence.alerts || []) {
    const w =
      alert.level === 'warning' ? -1 : alert.level === 'info' ? 0.5 : 0;
    const dir =
      alert.type === 'technical' && alert.message?.includes('rialzista')
        ? 'bull'
        : alert.message?.includes('ribassista')
          ? 'bear'
          : 'neutral';
    pushSignal(signals, {
      id: `alert-${alert.type}-${signals.length}`,
      category: 'alert',
      label: alert.message?.slice(0, 60) || alert.type,
      direction: dir,
      weight: dir === 'bull' ? w : dir === 'bear' ? -Math.abs(w) : 0,
      detail: alert.message,
    });
  }

  const pairs = intelligence.correlations || [];
  const strong = pairs.find((p) => Math.abs(p.rho) >= 0.65);
  if (strong) {
    pushSignal(signals, {
      id: 'correlation',
      category: 'correlation',
      label: `Correlazione ${strong.label || strong.peer}`,
      direction: 'neutral',
      weight: 0,
      detail: `ρ = ${strong.rho?.toFixed(2)} — considera diversificazione.`,
    });
  }

  return signals;
}

const PILLAR_META = {
  technical: { id: 'technical', label: 'Analisi tecnica', categories: ['technical', 'market'] },
  context: {
    id: 'context',
    label: 'Contesto mercato',
    categories: ['regime', 'geopolitical', 'risk', 'alert', 'correlation', 'ml'],
  },
  forecast: { id: 'forecast', label: 'Previsione', categories: ['forecast'] },
};

const SIMPLE_HEADLINES = {
  buy: 'Tendenza acquisto',
  accumulate: 'Valuta un acquisto',
  sell: 'Tendenza vendita',
  reduce: 'Valuta una vendita',
  hold: 'Resta in attesa',
};

function importedDataSignals(analysis, lastPrice) {
  const signals = [];
  const quote = analysis?.quote;
  const meta = analysis?.meta;
  let sourceSpreadPct = null;

  if (quote?.changePercent != null && Number.isFinite(quote.changePercent)) {
    const cp = quote.changePercent;
    if (cp >= 1.2) {
      pushSignal(signals, {
        id: 'quote-momentum-up',
        category: 'market',
        label: 'Quotazione in rialzo',
        direction: 'bull',
        weight: cp >= 3 ? 1.5 : 1,
        detail: `Variazione importata ${cp >= 0 ? '+' : ''}${cp.toFixed(2)}%.`,
      });
    } else if (cp <= -1.2) {
      pushSignal(signals, {
        id: 'quote-momentum-down',
        category: 'market',
        label: 'Quotazione in calo',
        direction: 'bear',
        weight: cp <= -3 ? -1.5 : -1,
        detail: `Variazione importata ${cp.toFixed(2)}%.`,
      });
    }
  } else if (quote?.change != null && lastPrice) {
    const pct = (quote.change / lastPrice) * 100;
    if (Math.abs(pct) >= 0.8) {
      pushSignal(signals, {
        id: 'quote-change',
        category: 'market',
        label: pct > 0 ? 'Prezzo in aumento' : 'Prezzo in diminuzione',
        direction: pct > 0 ? 'bull' : 'bear',
        weight: pct > 0 ? 1 : -1,
        detail: `Δ ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% sui dati live.`,
      });
    }
  }

  const series = analysis?.series;
  if (series?.length >= 5 && lastPrice) {
    const slice = series.slice(-6).map((p) => p.price);
    const first = slice[0];
    const trendPct = first ? ((lastPrice - first) / first) * 100 : 0;
    if (Math.abs(trendPct) >= 0.5) {
      pushSignal(signals, {
        id: 'series-trend',
        category: 'market',
        label: trendPct > 0 ? 'Trend recente positivo' : 'Trend recente negativo',
        direction: trendPct > 0 ? 'bull' : 'bear',
        weight: trendPct > 2 ? 1.5 : trendPct < -2 ? -1.5 : trendPct > 0 ? 1 : -1,
        detail: `Ultimi ${slice.length} punti: ${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(2)}%.`,
      });
    }
  }

  const alternates = meta?.alternates ?? [];
  if (alternates.length >= 1 && lastPrice) {
    const prices = [lastPrice, ...alternates.map((a) => a.price).filter(Number.isFinite)];
    if (prices.length >= 2) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      sourceSpreadPct = ((max - min) / lastPrice) * 100;
      if (sourceSpreadPct > 0.4) {
        pushSignal(signals, {
          id: 'sources-spread',
          category: 'market',
          label: 'Prezzi fonti non allineati',
          direction: 'neutral',
          weight: 0,
          detail: `Scostamento ${sourceSpreadPct.toFixed(2)}% tra le fonti importate — maggiore incertezza.`,
        });
      } else if (alternates.length >= 1) {
        pushSignal(signals, {
          id: 'sources-aligned',
          category: 'market',
          label: 'Fonti dati concordi',
          direction: 'bull',
          weight: 0.5,
          detail: 'Le quotazioni importate sono coerenti tra loro.',
        });
      }
    }
  }

  const sources = meta?.sources ?? [];
  const okSources = sources.filter((s) => s.ok).length;

  return {
    signals,
    dataQuality: {
      provider: meta?.provider ?? quote?.source ?? null,
      sourcesOk: okSources,
      sourcesTotal: sources.length,
      sourceSpreadPct,
    },
  };
}

function buildPillars(signals) {
  return Object.values(PILLAR_META).map((pillar) => {
    const pillarSignals = signals.filter((s) => pillar.categories.includes(s.category));
    const score = pillarSignals.reduce((sum, s) => sum + s.weight, 0);
    const maxAbs = pillarSignals.reduce((m, s) => m + Math.abs(s.weight), 0) || 1;
    const active = pillarSignals
      .filter((s) => s.weight !== 0)
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    let direction = 'neutral';
    if (score >= 1) direction = 'bull';
    else if (score <= -1) direction = 'bear';

    let summary = 'Nessun segnale rilevante';
    if (active.length) {
      summary = active[0].label;
      if (active.length > 1) summary += ` (+${active.length - 1})`;
    }

    return {
      ...pillar,
      score: Number(score.toFixed(2)),
      fillPct: Math.round(clamp((Math.abs(score) / maxAbs) * 100, 8, 100)),
      direction,
      summary,
      signalCount: pillarSignals.length,
    };
  });
}

function buildTopReasons(signals, limit = 3) {
  return signals
    .filter((s) => s.weight !== 0)
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, limit)
    .map((s) => ({
      direction: s.direction,
      text: s.detail ? `${s.label} — ${s.detail}` : s.label,
      short: s.label,
    }));
}

function buildDataSnapshot(analysis, lastPrice, dataQuality) {
  const quote = analysis?.quote;
  const provider = dataQuality?.provider;
  const sourcesOk = dataQuality?.sourcesOk ?? 0;
  const sourcesTotal = dataQuality?.sourcesTotal ?? 0;

  let sourcesLabel = provider ? String(provider) : '—';
  if (sourcesTotal > 0) {
    sourcesLabel = `${sourcesOk}/${sourcesTotal} fonti OK${provider ? ` · ${provider}` : ''}`;
  }

  return {
    price: lastPrice,
    changePercent: quote?.changePercent ?? null,
    currency: quote?.currency ?? null,
    provider,
    sourcesLabel,
    points: analysis?.pricesCount ?? analysis?.series?.length ?? null,
  };
}

function computeConfidence(score, signals, dataQuality) {
  const weightedBull = signals
    .filter((s) => s.weight > 0)
    .reduce((a, s) => a + s.weight, 0);
  const weightedBear = signals
    .filter((s) => s.weight < 0)
    .reduce((a, s) => a + Math.abs(s.weight), 0);
  const totalW = weightedBull + weightedBear || 1;
  const agreement = Math.max(weightedBull, weightedBear) / totalW;

  let confidence = clamp(
    0.32 + agreement * 0.48 + Math.min(Math.abs(score) / 10, 0.22),
    0.28,
    0.94
  );

  if (dataQuality?.sourcesTotal > 0 && dataQuality.sourcesOk < 2) {
    confidence *= 0.88;
  }
  if (dataQuality?.sourceSpreadPct != null && dataQuality.sourceSpreadPct > 0.4) {
    confidence *= 0.9;
  }

  return Number(confidence.toFixed(2));
}

function forecastSignals(forecast, lastPrice) {
  const signals = [];
  if (!forecast || lastPrice == null) return signals;

  const scenarios = forecast.scenarios || forecast.forecast?.scenarios;
  const combined = forecast.combined || forecast.geopolitical?.combined;
  const target =
    combined?.adjustedPrice ??
    scenarios?.hybrid?.at(-1)?.price ??
    scenarios?.linear?.at(-1)?.price ??
    scenarios?.forest?.at(-1)?.price;

  if (target != null) {
    const pct = ((target - lastPrice) / lastPrice) * 100;
    if (Math.abs(pct) >= 0.3) {
      pushSignal(signals, {
        id: 'forecast-horizon',
        category: 'forecast',
        label: pct > 0 ? 'Previsione orizzonte rialzista' : 'Previsione orizzonte ribassista',
        direction: pct > 0 ? 'bull' : 'bear',
        weight: pct > 2 ? 2 : pct < -2 ? -2 : pct > 0 ? 1 : -1,
        detail: `Target stimato ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% vs prezzo attuale.`,
      });
    }
  }

  return signals;
}

export function buildTradeAdvice({
  symbol,
  type,
  analysis,
  intelligence,
  forecast = null,
  horizonDays = 5,
}) {
  const lastPrice =
    analysis?.quote?.price ??
    intelligence?.lastPrice ??
    null;

  const { signals: marketSignals, dataQuality } = importedDataSignals(analysis, lastPrice);

  const signals = [
    ...marketSignals,
    ...technicalSignals(analysis, lastPrice),
    ...intelligenceSignals(intelligence),
    ...forecastSignals(forecast, lastPrice),
  ];

  const score = scoreFromSignals(signals);
  const { action, actionLabel, tone } = actionFromScore(score);

  const bull = signals.filter((s) => s.weight > 0).length;
  const bear = signals.filter((s) => s.weight < 0).length;
  const neutral = signals.length - bull - bear;

  const signalStrength = {
    bull: Number(
      signals.filter((s) => s.weight > 0).reduce((a, s) => a + s.weight, 0).toFixed(2)
    ),
    bear: Number(
      signals.filter((s) => s.weight < 0).reduce((a, s) => a + Math.abs(s.weight), 0).toFixed(2)
    ),
    neutral: signals.filter((s) => s.weight === 0).length,
  };

  const confidence = computeConfidence(score, signals, dataQuality);
  const pillars = buildPillars(signals);
  const topReasons = buildTopReasons(signals);
  const dataSnapshot = buildDataSnapshot(analysis, lastPrice, dataQuality);
  const gaugePosition = Math.round(clamp((score / 12) * 100, -100, 100));

  const simpleHeadline = SIMPLE_HEADLINES[action] || actionLabel;
  let summary = '';
  if (action === 'buy' || action === 'accumulate') {
    summary = `I dati importati e gli indicatori convergono verso un orientamento acquisto su ${symbol} (circa ${horizonDays} giorni).`;
  } else if (action === 'sell' || action === 'reduce') {
    summary = `Quotazione e contesto suggeriscono prudenza o riduzione su ${symbol}.`;
  } else {
    summary = `Segnali misti su ${symbol}: meglio attendere prima di acquistare o vendere.`;
  }

  if (topReasons[0]?.short) {
    summary = `${simpleHeadline}: ${topReasons[0].short}.`;
  }

  const byCategory = {
    technical: signals.filter((s) => s.category === 'technical'),
    geopolitical: signals.filter((s) => s.category === 'geopolitical'),
    regime: signals.filter((s) => s.category === 'regime'),
    risk: signals.filter((s) => s.category === 'risk'),
    forecast: signals.filter((s) => s.category === 'forecast'),
    ml: signals.filter((s) => s.category === 'ml'),
    alert: signals.filter((s) => s.category === 'alert'),
    correlation: signals.filter((s) => s.category === 'correlation'),
  };

  return {
    symbol,
    type,
    action,
    actionLabel,
    tone,
    score: Number(score.toFixed(2)),
    confidence,
    horizonDays,
    summary,
    lastPrice,
    signalCounts: { bull, bear, neutral, total: signals.length },
    signalStrength,
    signals: signals.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)),
    byCategory,
    simple: {
      headline: simpleHeadline,
      gaugePosition,
      gaugeLabel:
        gaugePosition >= 35
          ? 'Verso acquisto'
          : gaugePosition <= -35
            ? 'Verso vendita'
            : 'Zona neutra',
    },
    pillars,
    topReasons,
    dataSnapshot,
    dataQuality,
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}
