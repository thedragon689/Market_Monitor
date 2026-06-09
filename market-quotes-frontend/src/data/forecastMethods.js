/** Metadati metodi previsione — gruppi, requisiti storico, UI. */

export const FORECAST_METHOD_GROUPS = [
  {
    id: 'classic',
    label: 'Classici',
    hint: 'Veloci · bastano pochi giorni',
  },
  {
    id: 'ml',
    label: 'Machine Learning',
    hint: 'ARIMA e LSTM',
  },
  {
    id: 'all',
    label: 'Confronta tutti',
    hint: '5 metodi sullo stesso grafico',
  },
];

export const FORECAST_METHOD_META = {
  both: {
    group: 'classic',
    label: 'SMA + Regressione',
    hint: 'Media mobile e trend lineare insieme',
    detail: 'Due linee sul grafico: verde (SMA) e arancione (regressione)',
    minHistory: 2,
    chartKey: 'combo',
    badge: 'Consigliato',
    output: '2 scenari',
  },
  sma: {
    group: 'classic',
    label: 'Solo SMA',
    hint: 'Prezzo costante alla media recente',
    detail: 'Linea orizzontale verde all’ultima media mobile',
    minHistory: 2,
    chartKey: 'sma',
    badge: 'Veloce',
    output: 'Livello medio',
  },
  linear: {
    group: 'classic',
    label: 'Solo regressione',
    hint: 'Estrapola il trend degli ultimi N giorni',
    detail: 'Retta arancione sul trend della finestra N',
    minHistory: 2,
    chartKey: 'linear',
    badge: 'Trend',
    output: 'Retta proiettata',
  },
  log: {
    group: 'classic',
    label: 'Log-return',
    hint: 'Media dei rendimenti percentuali giornalieri',
    detail: 'Utile quando le variazioni % sono simili nel tempo',
    minHistory: 2,
    chartKey: 'log',
    badge: 'Rendimenti',
    output: 'Crescita composta',
  },
  ml: {
    group: 'ml',
    label: 'ARIMA + LSTM',
    hint: 'Confronta entrambi i motori ML',
    detail: 'Viola (ARIMA) e rosa (LSTM) sullo stesso grafico',
    minHistory: 28,
    combo: true,
    chartKey: 'ml-combo',
    badge: 'Confronto ML',
    output: '2 motori',
  },
  arima: {
    group: 'ml',
    label: 'ARIMA',
    hint: 'Modella trend e autocorrelazione nei residui',
    detail: 'Ideale per serie con struttura temporale regolare',
    minHistory: 18,
    engine: 'arima',
    chartKey: 'arima',
    tag: 'Statistica',
    badge: 'Serie temporale',
    output: 'Modello (p,d,q)',
  },
  lstm: {
    group: 'ml',
    label: 'LSTM',
    hint: 'Rete neurale addestrata sui rendimenti recenti',
    detail: 'Cattura pattern non lineari negli ultimi movimenti',
    minHistory: 28,
    engine: 'lstm',
    chartKey: 'lstm',
    tag: 'Neurale',
    badge: 'Deep learning',
    output: 'Pattern non lineari',
  },
  all: {
    group: 'all',
    label: 'Tutti i metodi',
    hint: 'SMA, regressione, log-return, ARIMA e LSTM',
    detail: 'Confronto completo su un unico grafico — richiede più storico',
    minHistory: 30,
    chartKey: 'all',
    badge: 'Analisi completa',
    output: '5 scenari',
  },
};

export const CLASSIC_METHOD_IDS = ['both', 'sma', 'linear', 'log'];
export const ML_METHOD_IDS = ['arima', 'lstm', 'ml'];
export const DESKTOP_METHOD_SECTIONS = [
  {
    id: 'classic',
    title: 'Metodi classici',
    subtitle: 'Calcolo rapido · bastano pochi giorni di storico',
    ids: CLASSIC_METHOD_IDS,
  },
  {
    id: 'ml',
    title: 'Machine learning',
    subtitle: 'ARIMA e LSTM · servono 18–28+ giorni',
    ids: ML_METHOD_IDS,
  },
  {
    id: 'all',
    title: 'Confronto completo',
    subtitle: 'Tutte le stime sullo stesso grafico',
    ids: ['all'],
    wide: true,
  },
];

const GROUP_DEFAULTS = {
  classic: 'both',
  ml: 'ml',
  all: 'all',
};

export function methodToGroup(method) {
  return FORECAST_METHOD_META[method]?.group ?? 'classic';
}

export function getMethodMeta(method) {
  return FORECAST_METHOD_META[method] ?? FORECAST_METHOD_META.both;
}

export function defaultMethodForGroup(groupId) {
  return GROUP_DEFAULTS[groupId] ?? 'both';
}

export function historyWarning(method, historyLength) {
  if (historyLength == null || historyLength <= 0) return null;
  const meta = getMethodMeta(method);
  if (historyLength >= meta.minHistory) return null;
  if (method === 'ml') {
    return `Per ARIMA + LSTM servono almeno 28 giorni di storico (disponibili: ${historyLength}).`;
  }
  if (method === 'all') {
    return `Per confrontare tutti i metodi servono almeno 30 giorni (disponibili: ${historyLength}).`;
  }
  if (meta.engine === 'arima') {
    return `ARIMA richiede almeno 18 giorni di storico (disponibili: ${historyLength}).`;
  }
  if (meta.engine === 'lstm') {
    return `LSTM richiede almeno 28 giorni di storico (disponibili: ${historyLength}).`;
  }
  return null;
}
