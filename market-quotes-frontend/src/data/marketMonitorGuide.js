/**
 * Guida Market Monitor per l'assistente locale: spiega funzionamento,
 * sezioni dell'app e flusso utente (offline, senza LLM).
 */

export const APP_GUIDE_INTRO =
  '**Market Monitor** è una piattaforma web per analizzare e monitorare i mercati finanziari. ' +
  'Non esegue ordini in borsa e non gestisce denaro reale: è uno strumento **informativo ed educativo**.\n\n' +
  '**Flusso in 4 passi:** Scegli asset → Analizza → Consiglio operativo → Previsioni.\n\n' +
  'Chiedimi dettagli su: *quotazioni*, *previsioni*, *portfolio*, *watchlist*, *assistente* o *notifiche*.';

/** Argomenti della guida: keyword → risposta strutturata. */
export const APP_GUIDE_TOPICS = [
  {
    id: 'overview',
    keywords: [
      'market monitor', 'che cos', 'a cosa serve', 'obiettivi', 'missione',
      'presentazione', 'panoramica', 'in generale', 'overview', 'introduzione', 'cosa fa',
      'funzionamento', 'come funziona', 'come si usa', 'tutorial', 'guida', 'spiega l app',
      'spiega app', 'cosa puoi fare', 'funzionalita', 'funzionalità',
    ],
    answer:
      '**Market Monitor** unifica quotazioni, analisi tecnica, intelligence di mercato, previsioni multi-metodo e portfolio personale.\n\n' +
      '**Cosa puoi fare:**\n' +
      '- Cercare asset (azioni, ETF, forex, crypto, metalli, commodity) e vedere prezzo live e grafici\n' +
      '- Leggere indicatori (RSI, MACD, medie, Bollinger) e avvisi intelligenti\n' +
      '- Ottenere un consiglio orientativo (acquisto / vendita / mantieni) con motivazioni\n' +
      '- Confrontare previsioni (ARIMA, LSTM, Prophet, ensemble con bande di confidenza)\n' +
      '- Gestire watchlist e portfolio con alert su Telegram, email, Slack e push\n\n' +
      '**Navigazione:** barra inferiore su mobile (Mercati, Watchlist, Portfolio, Info); su desktop le viste Analisi, Previsioni e Consiglio.\n\n' +
      '⚠️ Contenuti educativi, non consulenza finanziaria.',
  },
  {
    id: 'quotes',
    keywords: [
      'quotazion', 'prezzo live', 'grafico', 'candele', 'candlestick', 'storico', 'time frame',
      'binance', 'kraken', 'websocket', 'crypto live', 'explore', 'mercati', 'cerca asset',
    ],
    answer:
      '**Quotazioni e grafici**\n\n' +
      '- **Prezzo attuale** e variazione % giornaliera per ogni asset\n' +
      '- **Storico** con time frame 1D, 1W, 1M, 3M, 1A\n' +
      '- **Grafici a candele** con overlay SMA, EMA e Bollinger\n' +
      '- **Crypto** (BTC, ETH…): stream live da Binance/Kraken con fallback server\n' +
      '- **Confronto multi-asset** e catalogo con ricerca rapida\n' +
      '- Prezzi in EUR con riferimento USD quando disponibile il cambio\n\n' +
      'Prova: *"prezzo di BTC"* o *"grafico di Apple"*.',
  },
  {
    id: 'analysis',
    keywords: [
      'analisi', 'indicator', 'intelligence', 'correlaz', 'regime', 'rischio',
      'geopolit', 'sentiment', 'terminal', 'commodity', 'avvisi intelligent', 'trade advice',
      'consiglio operativo', 'consigli',
    ],
    answer:
      '**Analisi e intelligence**\n\n' +
      '- **Indicatori:** SMA, EMA, RSI, MACD, Bollinger, ATR, momentum, CCI, Williams %R\n' +
      '- **Avvisi intelligenti:** incroci medie, bande Bollinger, volatilità, VIX, eventi geopolitici\n' +
      '- **Correlazioni** tra asset (Pearson sui log-returns) con heatmap\n' +
      '- **Regime di mercato** (trend, laterale, stress) e profilo di rischio\n' +
      '- **Consiglio operativo:** aggrega segnali tecnici, previsioni, regime e geopolitica → acquisto / vendita / mantieni con motivazioni\n' +
      '- **Terminal:** desk multi-mercato (indici, settori, valute, crypto, macro)\n\n' +
      'Prova: *"RSI di ETH"* o *"consiglio su Tesla"*.',
  },
  {
    id: 'forecast',
    keywords: [
      'prevision', 'forecast', 'arima', 'lstm', 'prophet', 'ensemble', 'modello', 'machine learning',
      'ml', 'intervall', 'confidenza', 'bande',
    ],
    answer:
      '**Previsioni**\n\n' +
      '- **Metodi veloci:** media mobile (SMA), regressione lineare, log-return\n' +
      '- **ML classico:** ARIMA, LSTM leggero, Prophet (stagionalità)\n' +
      '- **Ensemble:** media pesata dei modelli + bande di confidenza 80% e 95%\n' +
      '- Confronto di più metodi sullo stesso grafico\n' +
      '- Integrazione opzionale del contesto geopolitico\n\n' +
      'Servono almeno 18–30 giorni di storico per i modelli ML. Prova: *"previsione BTC 7 giorni"*.',
  },
  {
    id: 'portfolio',
    keywords: [
      'portfolio', 'portafoglio', 'posizion', 'transazion', 'p/l', 'pl totale', 'alert',
      'notific', 'telegram', 'whatsapp', 'slack', 'email', 'registr', 'login', 'account',
    ],
    answer:
      '**Portfolio personale** (richiede account)\n\n' +
      '- Registrazione sicura (password cifrate, JWT)\n' +
      '- Aggiungi asset con quantità, prezzo medio e soglie alert guadagno/perdita\n' +
      '- Transazioni acquisto/vendita con ricalcolo automatico del prezzo medio\n' +
      '- Dashboard: valore totale, P/L assoluto e % (in EUR)\n' +
      '- Grafico storico del portfolio (snapshot ogni ~5 min)\n' +
      '- **Alert multi-canale:** Telegram, WhatsApp, Slack, email, push web\n\n' +
      'Prova: *"come sta il mio portfolio"* o *"alert BTC sopra 70k"*.',
  },
  {
    id: 'watchlist',
    keywords: ['watchlist', 'preferit', 'lista osserv', 'colonne', 'export', 'csv'],
    answer:
      '**Watchlist**\n\n' +
      '- Lista personale di asset da monitorare (salvata nel browser)\n' +
      '- Colonne personalizzabili, ordinamento, indicatori RSI/SMA inline\n' +
      '- Dettaglio asset con grafico a candele e statistiche\n' +
      '- Export CSV e aggiunta rapida dalla ricerca\n\n' +
      'Apri la sezione **Watchlist** dalla barra di navigazione.',
  },
  {
    id: 'assistant',
    keywords: [
      'assistente', 'chatbot', 'chat', 'voce', 'tts', 'parlare', 'dettatura', 'microfono',
      'lingua', 'traduz',
    ],
    answer:
      '**Assistente AI (questa chat)**\n\n' +
      '- Risponde su indicatori, asset, watchlist e portfolio anche **offline** (motore locale)\n' +
      '- Con API configurate: risposte libere via LLM e traduzione multilingue\n' +
      '- **Voce:** lettura delle risposte (neurale Edge se disponibile, altrimenti voce del browser)\n' +
      '- **Dettatura** vocale per scrivere i messaggi (microfono)\n' +
      '- Comandi naturali: *"prezzo Apple"*, *"previsione BTC"*, *"cos\'è l\'RSI?"*, *"come funziona Market Monitor"*\n\n' +
      'Contenuti educativi, non consulenza finanziaria.',
  },
];

const APP_GUIDE_TRIGGERS = [
  'market monitor',
  'come funziona',
  'come si usa',
  'cosa fa',
  'a cosa serve',
  'spiega',
  'guida',
  'tutorial',
  'funzionalita',
  'funzionalità',
  'presentazione',
  'panoramica',
];

/**
 * Trova il topic guida più pertinente, o null.
 * @param {string} norm - testo normalizzato (minuscolo, senza accenti)
 */
export function findAppGuideTopic(norm) {
  if (!norm?.trim()) return null;
  let best = null;
  let bestScore = 0;
  for (const topic of APP_GUIDE_TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      const k = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (norm.includes(k)) score += k.length >= 6 ? 3 : 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return bestScore >= 2 ? best : null;
}

/** True se la domanda riguarda il funzionamento dell'app. */
export function isAppGuideQuestion(norm) {
  if (!norm?.trim()) return false;

  const conceptCue = norm.includes("cos'e") || norm.includes('cos e') || norm.includes('che cos') || norm.includes('significa');
  const finConcept =
    /(rsi|macd|sma|ema|bollinger|arima|lstm|prophet|volatilit|fibonacci|correlaz|supporto|resistenza|p\/e|pe ratio)/.test(
      norm
    );
  if (conceptCue && finConcept) return false;

  const hasTrigger = APP_GUIDE_TRIGGERS.some((t) => norm.includes(t));
  const hasApp = norm.includes('market monitor') || norm.includes('app') || norm.includes('piattaforma');
  const isHow = norm.includes('come funziona') || norm.includes('come si usa') || norm.includes('cosa fa');
  if (hasTrigger && (hasApp || isHow)) return true;
  if (norm.includes('market monitor') && (norm.includes('cos') || norm.includes('spiega') || norm.includes('funziona'))) {
    return true;
  }
  return findAppGuideTopic(norm) != null && (hasTrigger || isHow || norm.includes('cos'));
}

/** Risposta guida: topic specifico o intro generale. */
export function buildAppGuideAnswer(norm) {
  const topic = findAppGuideTopic(norm);
  if (topic) return { reply: topic.answer, topicId: topic.id, confidence: 0.96 };
  return { reply: APP_GUIDE_INTRO, topicId: 'intro', confidence: 0.94 };
}
