import { ALL_SYMBOLS, TYPE_LABELS } from '../data/allSymbols';
import { classifyIntent, detectMultiIntent } from './intentClassifier';
import { INTENT_META } from '../data/intentDataset';
import {
  isAppGuideQuestion,
  buildAppGuideAnswer,
  APP_GUIDE_INTRO,
} from '../data/marketMonitorGuide';

/**
 * Motore assistente locale (funziona offline): spiega indicatori/concetti,
 * riconosce intent (analisi, previsione, prezzo), risolve simboli e risponde
 * su watchlist/portfolio dal contesto. Restituisce { reply, action, confidence }.
 */

// Base di conoscenza: concetti finanziari con parole chiave e spiegazione.
export const KNOWLEDGE = [
  {
    id: 'rsi',
    keywords: ['rsi', 'relative strength', 'forza relativa'],
    answer:
      "**RSI (Relative Strength Index)** è un oscillatore 0–100 che misura la forza del movimento.\n\n- **> 70**: ipercomprato (possibile correzione)\n- **< 30**: ipervenduto (possibile rimbalzo)\n- **~ 50**: momentum neutro\n\nÈ utile per individuare eccessi, ma va confermato con trend e volumi.",
  },
  {
    id: 'macd',
    keywords: ['macd', 'convergence divergence'],
    answer:
      '**MACD** confronta due medie mobili esponenziali (12 e 26) e la loro *signal line* (9).\n\n- **Incrocio rialzista**: MACD supera la signal → segnale di forza\n- **Incrocio ribassista**: MACD sotto la signal → debolezza\n- **Istogramma**: distanza tra le due linee, misura il momentum.',
  },
  {
    id: 'sma_ema',
    keywords: ['sma', 'ema', 'media mobile', 'medie mobili', 'moving average'],
    answer:
      '**Medie mobili** lisciano il prezzo per evidenziare il trend.\n\n- **SMA**: media semplice, più stabile\n- **EMA**: media esponenziale, più reattiva ai prezzi recenti\n\nIncroci tra medie (es. EMA20 vs EMA50) sono usati come segnali di trend.',
  },
  {
    id: 'bollinger',
    keywords: ['bollinger', 'bande'],
    answer:
      '**Bande di Bollinger**: una media (20) con due bande a ±2 deviazioni standard.\n\n- Prezzo vicino alla **banda superiore** → possibile eccesso rialzista\n- Vicino alla **inferiore** → possibile eccesso ribassista\n- Bande strette (*squeeze*) → bassa volatilità, spesso precede movimenti ampi.',
  },
  {
    id: 'volatility',
    keywords: ['volatilità', 'volatilita', 'volatility', 'deviazione standard'],
    answer:
      '**Volatilità**: quanto oscilla il prezzo. Alta volatilità = rischio e opportunità maggiori. Si misura spesso con la deviazione standard dei rendimenti o con indici come il **VIX**.',
  },
  {
    id: 'arima',
    keywords: ['arima'],
    answer:
      '**ARIMA** è un modello statistico per serie storiche che combina componenti autoregressive, di media mobile e di differenziazione. Adatto a trend e stagionalità di breve periodo; non "conosce" eventi esterni.',
  },
  {
    id: 'lstm',
    keywords: ['lstm', 'rete neurale', 'neural'],
    answer:
      '**LSTM** è una rete neurale ricorrente capace di apprendere dipendenze temporali. Può cogliere pattern non lineari, ma richiede più dati ed è meno interpretabile dei modelli statistici.',
  },
  {
    id: 'prophet',
    keywords: ['prophet'],
    answer:
      '**Prophet** è un modello additivo (trend + stagionalità + festività) pensato per previsioni robuste e facili da interpretare su serie con stagionalità marcata.',
  },
  {
    id: 'diversification',
    keywords: ['diversific', 'diversization', 'allocazione', 'asset allocation'],
    answer:
      '**Diversificazione**: distribuire il capitale su asset poco correlati per ridurre il rischio complessivo senza rinunciare troppo al rendimento. "Non mettere tutte le uova nello stesso paniere".',
  },
  {
    id: 'pe',
    keywords: ['p/e', 'pe ratio', 'price earnings', 'prezzo utili'],
    answer:
      '**P/E (Price/Earnings)**: prezzo diviso utili per azione. Indica quanto il mercato paga ogni euro di utili. Alto P/E = aspettative di crescita elevate (o sopravvalutazione); va confrontato col settore.',
  },
  {
    id: 'support_resistance',
    keywords: ['supporto', 'resistenza', 'support', 'resistance'],
    answer:
      '**Supporto**: livello dove il prezzo tende a fermare le discese. **Resistenza**: livello dove tende a fermare i rialzi. La rottura di questi livelli con volumi è spesso un segnale operativo.',
  },
  {
    id: 'fibonacci',
    keywords: ['fibonacci', 'ritracciamento', 'retracement'],
    answer:
      '**Ritracciamenti di Fibonacci** (23.6%, 38.2%, 50%, 61.8%): livelli usati per stimare possibili aree di rimbalzo o correzione all’interno di un trend.',
  },
  {
    id: 'correlation',
    keywords: ['correlazione', 'correlation'],
    answer:
      '**Correlazione** (da -1 a +1): misura quanto due asset si muovono insieme. +1 = stesso verso, -1 = opposti, 0 = indipendenti. Utile per diversificare e gestire il rischio.',
  },
  {
    id: 'disclaimer',
    keywords: ['consiglio finanziario', 'affidabile', 'garantit', 'sicuro investire', 'disclaimer'],
    answer:
      "⚠️ Le informazioni qui fornite sono **educative**, basate su dati pubblici e modelli statistici. **Non** sono consulenza finanziaria e non garantiscono risultati. Le decisioni di investimento restano una tua responsabilità.",
  },
];

const STOPWORDS = new Set([
  'di', 'il', 'lo', 'la', 'le', 'un', 'una', 'come', 'va', 'che', 'cosa', 'del',
  'the', 'a', 'e', 'per', 'su', 'con', 'mi', 'puoi', 'dimmi', 'analizza',
  'analisi', 'previsione', 'prevedi', 'prezzo', 'quanto', 'vale', 'quotazione',
  'forecast', 'andamento', 'pensi', 'ne',
]);

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Risolve un simbolo dal testo: match esatto sul ticker o sul nome. */
export function resolveSymbol(text) {
  const norm = normalize(text);
  const tokens = norm.replace(/[^a-z0-9.\-\s]/g, ' ').split(/\s+/).filter(Boolean);
  const tokenSet = new Set(tokens);

  let best = null;
  let bestScore = 0;

  for (const entry of ALL_SYMBOLS) {
    const sym = normalize(entry.symbol);
    const name = normalize(entry.name);
    let score = 0;

    // Ticker esatto (es. "aapl", "btc-usd").
    if (tokenSet.has(sym)) score = Math.max(score, 100);
    const symBase = sym.split('-')[0];
    if (symBase.length >= 3 && tokenSet.has(symBase)) score = Math.max(score, 90);

    // Nome completo contenuto (es. "bitcoin", "apple").
    if (name.length >= 3 && norm.includes(name)) score = Math.max(score, 60 + name.length);

    // Token di nome significativo.
    for (const nt of name.split(/\s+/)) {
      if (nt.length >= 4 && !STOPWORDS.has(nt) && tokenSet.has(nt)) {
        score = Math.max(score, 50 + nt.length);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore >= 50 ? best : null;
}

function findConcept(norm) {
  for (const k of KNOWLEDGE) {
    if (k.keywords.some((kw) => norm.includes(normalize(kw)))) return k;
  }
  return null;
}

function has(norm, words) {
  return words.some((w) => norm.includes(w));
}

function formatWatchlist(watchlist) {
  if (!watchlist?.length) {
    return 'La tua **watchlist** è vuota. Aprila dalla navigazione e aggiungi asset con la ricerca rapida.';
  }
  const lines = watchlist
    .slice(0, 12)
    .map((w) => `- **${w.symbol}** · ${TYPE_LABELS[w.type] || w.type}${w.name ? ` — ${w.name}` : ''}`);
  return `Nella tua **watchlist** ci sono ${watchlist.length} asset:\n\n${lines.join('\n')}`;
}

const HELP =
  "Sono l'assistente di **Market Monitor**. Posso:\n\n" +
  '- **Spiegare come funziona l\'app** (es. "come funziona Market Monitor?", "cosa fa il portfolio?")\n' +
  '- **Spiegare indicatori** (es. "cos\'è l\'RSI?", "come funziona il MACD?")\n' +
  '- **Aprire analisi e grafici** (es. "prezzo di Apple", "grafico BTC")\n' +
  '- **Avviare previsioni** (es. "previsione Tesla")\n' +
  '- Rispondere su **watchlist** e **portfolio**\n\n' +
  APP_GUIDE_INTRO.split('\n\n').slice(-1)[0];

const FALLBACK_REPLY =
  "Non sono sicuro di aver capito. Prova con: *\"prezzo di BTC\"*, *\"grafico di Apple\"*, " +
  '*\"previsione Tesla\"*, *\"RSI di ETH\"* oppure chiedi del tuo portfolio o della watchlist.';

/** Etichetta leggibile di un asset risolto. */
function assetLabel(s) {
  return `**${s.name}** (${s.symbol} · ${TYPE_LABELS[s.type] || s.type})`;
}

/** Simbolo dal testo; in mancanza, quello del contesto (asset già aperto). */
function effectiveSymbol(text, context) {
  const found = resolveSymbol(text);
  if (found) return found;
  if (context?.symbol) {
    return {
      symbol: context.symbol,
      name: context.assetName || context.symbol,
      type: context.type || 'stock',
    };
  }
  return null;
}

const navAsset = (view, s) => ({
  type: 'navigate',
  view,
  symbol: s.symbol,
  symbolType: s.type,
});

/** Traduce un intent (single-label) in risposta + azione di navigazione. */
function routeIntent(intent, confidence, text, context, symbolEntry, concept) {
  const label = symbolEntry ? assetLabel(symbolEntry) : null;
  const R = (reply, action, extra = {}) => ({ reply, action, confidence, intent, ...extra });

  switch (intent) {
    case 'get_price':
      return symbolEntry
        ? R(`Apro l’**analisi** di ${label}: quotazione live e variazione.`, navAsset('analysis', symbolEntry))
        : R('Di quale asset vuoi il prezzo? Es. *BTC*, *Apple*, *EUR/USD*.', null, { confidence: 0.4 });

    case 'get_chart':
      return symbolEntry
        ? R(`Mostro il **grafico** di ${label} (candele, medie e indicatori) nell’analisi.`, navAsset('analysis', symbolEntry))
        : R('Di quale asset vuoi il grafico?', null, { confidence: 0.4 });

    case 'get_indicators':
      if (symbolEntry) {
        return R(
          `Apro gli **indicatori** di ${label}: RSI, MACD, medie mobili e Bollinger.`,
          navAsset('analysis', symbolEntry)
        );
      }
      if (concept) return { reply: concept.answer, confidence: 0.85, conceptId: concept.id, intent };
      return R('Su quale asset calcolo gli indicatori? (RSI, MACD, ATR, Bollinger…)', null, { confidence: 0.4 });

    case 'get_intelligence':
      return symbolEntry
        ? R(`Apro l’**intelligence** di ${label}: regime, profilo di rischio e stress di mercato.`, navAsset('analysis', symbolEntry))
        : R('Apro l’**analisi** di mercato: regime, rischio e segnali di stress.', { type: 'navigate', view: 'analysis' });

    case 'get_correlations':
      return symbolEntry
        ? R(`Apro la **matrice di correlazioni** (Pearson sui log-returns) per ${label}.`, navAsset('analysis', symbolEntry))
        : R('Apro la **matrice di correlazioni** (Pearson sui log-returns) nell’analisi.', { type: 'navigate', view: 'analysis' });

    case 'get_forecast':
      return symbolEntry
        ? R(`Avvio la **previsione** per ${label}: ARIMA, LSTM ed ensemble con intervalli di confidenza.`, navAsset('forecast', symbolEntry))
        : R('Di quale asset vuoi la previsione?', null, { confidence: 0.4 });

    case 'get_trade_advice': {
      const named = resolveSymbol(text);
      if (named) {
        return R(
          `Carico ${assetLabel(named)}: apri la scheda **Consiglio operativo** per segnale e motivazione.`,
          navAsset('analysis', named)
        );
      }
      return R('Apro il **consiglio operativo** (segnale + motivazione) per l’asset selezionato.', {
        type: 'navigate',
        view: 'advice',
      });
    }

    case 'portfolio_add':
      return R(
        'Per **aggiungere** un asset apro il Portfolio: usa “Aggiungi” inserendo simbolo, quantità e prezzo medio.',
        { type: 'navigate', view: 'portfolio' }
      );

    case 'portfolio_status':
      return context.hasPortfolio
        ? R('Apro il tuo **Portfolio** con P/L, valore e posizioni aggiornati.', { type: 'navigate', view: 'portfolio' })
        : R(
            'Per vedere P/L e valore del **portfolio** devi prima accedere: apri la sezione Portfolio e crea un account o effettua il login.',
            { type: 'navigate', view: 'portfolio' }
          );

    case 'portfolio_alert':
      return R(
        'Gli **alert** si impostano dal Portfolio: soglie di guadagno/perdita per ogni asset, con notifiche multi-canale. Apro la sezione.',
        { type: 'navigate', view: 'portfolio' }
      );

    case 'portfolio_history':
      return R('Apro lo **storico** delle transazioni e dei movimenti nel Portfolio.', {
        type: 'navigate',
        view: 'portfolio',
      });

    case 'api_info':
      return R(
        'Le API principali: **/api/market**, **/api/history**, **/api/forecast**, **/api/analysis-bundle**, ' +
          '**/api/ohlc**. Dimmi quale ti interessa e ti spiego parametri e risposta.',
        null,
        { confidence: 0.35 }
      );

    case 'technical_debug':
      return R(
        'Descrivi il problema (forecast, WebSocket crypto, fallback dati, trade advice…) e ti aiuto a diagnosticarlo passo passo.',
        null,
        { confidence: 0.35 }
      );

    case 'casual_question':
      return R(
        'Posso parlarti di mercati, singoli asset, indicatori tecnici e previsioni. Su cosa vuoi che ci concentriamo?',
        null,
        { confidence: 0.3, fallback: true }
      );

    case 'noise':
    default:
      return { reply: FALLBACK_REPLY, confidence: 0.2, fallback: true, intent: 'noise' };
  }
}

/** Gestisce frasi con più intent: elenca le richieste ed esegue la prima azionabile. */
function handleMulti(intents, text, context, symbolEntry, concept) {
  const labels = intents.map((i) => INTENT_META[i]?.label || i);
  const first = routeIntent(intents[0], 0.9, text, context, symbolEntry, concept);
  const list = labels.map((l, i) => `${i + 1}. ${l}`).join('\n');
  const reply =
    `Ho riconosciuto più richieste:\n${list}\n\nInizio con **${labels[0]}**.` +
    (first.reply ? `\n\n${first.reply}` : '');
  return { reply, action: first.action, confidence: 0.85, intent: 'multi_intent', intents };
}

/**
 * Costruisce una risposta locale con classificazione di intent (dataset-driven).
 * context: { view, symbol, type, assetName, watchlist, hasPortfolio }
 */
export function buildLocalAnswer(text, context = {}) {
  const norm = normalize(text);

  if (!norm.trim()) {
    return { reply: HELP, confidence: 1 };
  }

  // Saluti / aiuto
  if (has(norm, ['ciao', 'salve', 'buongiorno', 'buonasera', 'aiuto', 'help', 'cosa sai', 'cosa puoi'])) {
    return { reply: HELP, confidence: 1 };
  }

  // Spiegazione esplicita di un concetto/indicatore ("cos'è l'RSI?", "come funziona il MACD?")
  const concept = findConcept(norm);
  const isConceptQuestion = has(norm, ["cos'e", 'cos e', 'che cos', 'come funziona', 'spiega', 'significa', 'definizione']);
  if (concept && isConceptQuestion) {
    return { reply: concept.answer, confidence: 0.95, conceptId: concept.id };
  }

  // Guida all'app: funzionamento, sezioni, tutorial
  if (isAppGuideQuestion(norm)) {
    const guide = buildAppGuideAnswer(norm);
    return { reply: guide.reply, confidence: guide.confidence, guideTopic: guide.topicId };
  }

  // Watchlist (nessun intent dedicato nel dataset: gestita a parole chiave)
  if (has(norm, ['watchlist', 'preferit', 'osservat'])) {
    return {
      reply: formatWatchlist(context.watchlist),
      action: { type: 'navigate', view: 'watchlist' },
      confidence: 0.9,
    };
  }

  const symbolEntry = effectiveSymbol(text, context);

  // Frasi composte: più intent in un'unica richiesta.
  const multi = detectMultiIntent(text);
  if (multi.length >= 2) {
    return handleMulti(multi, text, context, symbolEntry, concept);
  }

  // Intent singolo dal classificatore locale.
  const { intent, confidence } = classifyIntent(text);
  return routeIntent(intent, confidence, text, context, symbolEntry, concept);
}
