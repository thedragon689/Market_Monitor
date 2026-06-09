/** Contenuti della legenda esplicativa — sincronizzare con logiche in lib/ e UI. */

export const LEGEND_SECTIONS = [
  {
    id: 'navigazione',
    title: 'Come usare l’app',
    views: ['explore', 'analysis', 'forecast'],
    items: [
      {
        term: '1 · Scegli',
        description:
          'Seleziona la categoria (azioni, nazionali, crypto, metalli, materie prime) e l’asset da monitorare. Catalogo, chip rapidi e tabella confronto mostrano i prezzi attuali.',
      },
      {
        term: '2 · Analizza',
        description:
          'Quotazione live, grafico storico, indicatori tecnici, correlazioni e contesto geopolitico (attivo di default su tutte le categorie). Si apre quando selezioni un titolo.',
      },
      {
        term: '3 · Prevedi',
        description:
          'Imposta finestra (N), orizzonte in giorni e metodo, poi calcola scenari futuri. Il grafico unisce storico (linea continua) e stime (tratteggiate).',
      },
      {
        term: 'Scelte pannello',
        description:
          'In ogni passo puoi attivare chip come Legenda, Contesto globale, Confronto o Tutte le categorie — niente più sezioni nascoste, solo opzioni disattivabili.',
      },
      {
        term: 'Prevedi (pulsante)',
        description:
          'Avvia il calcolo previsione sull’asset attivo. Disponibile nella barra in alto, nel footer di ogni passo e sulle card del catalogo.',
      },
    ],
  },
  {
    id: 'categorie',
    title: 'Categorie di mercato',
    views: ['explore'],
    items: [
      {
        term: 'Azioni',
        description:
          'Titoli internazionali USA, Europa e Africa. Prezzo per singola azione, mostrato in euro con riferimento USD quando disponibile il cambio EUR/USD.',
      },
      {
        term: 'Azioni nazionali',
        description:
          'Blue chip quotate su Borsa Italiana (FTSE MIB): Eni, Intesa, Ferrari, Leonardo e altri. Prezzo in euro per singola azione.',
      },
      {
        term: 'Criptovalute',
        description:
          'Asset digitali spot (Bitcoin, Ethereum, Solana, …). Bitcoin usa quotazioni live da Binance (BTCUSDT) e Kraken (XBT/USD) via REST e WebSocket.',
      },
      {
        term: 'Metalli preziosi',
        description:
          'Oro, argento, platino e palladio (spot). Prezzo convertito al grammo (€/g e $/g) da oncia troy.',
      },
      {
        term: 'Materie prime',
        description:
          'Energia (WTI, Brent, gas), metalli (rame, nickel, litio), agricoli (mais, grano, soia). Dashboard con spot, volume, open interest, forward curve (contango/backwardation), macro DXY, modelli ARIMA/LSTM/Prophet e news filtrate.',
      },
      {
        term: 'Var. %',
        description:
          'Variazione percentuale rispetto alla chiusura precedente. Verde = rialzo, rosso = ribasso.',
      },
    ],
  },
  {
    id: 'quotazioni',
    title: 'Quotazione e dati',
    views: ['analysis'],
    items: [
      {
        term: 'Prezzo attuale',
        description:
          'Ultima quotazione disponibile da Yahoo Finance o Stooq. Aggiornamento al cambio di asset o con il pulsante ↻.',
      },
      {
        term: 'EUR + USD',
        description:
          'I prezzi in dollaro vengono convertiti in euro usando il tasso EUR/USD restituito dall’API (quanti USD vale 1 €).',
      },
      {
        term: 'Andamento (grafico)',
        description:
          'Serie storica degli ultimi ~90 giorni di chiusure. L’asse Y è in euro quando il cambio è disponibile.',
      },
      {
        term: 'Dati live',
        description:
          'Fonti di mercato in tempo differita (Yahoo, Stooq). Possibili ritardi o storico limitato senza chiave Stooq.',
      },
    ],
  },
  {
    id: 'analisi',
    title: 'Analisi tecnica',
    views: ['analysis'],
    items: [
      {
        term: 'SMA (media mobile semplice)',
        formula: 'SMAₙ = (P₁ + … + Pₙ) / n',
        description:
          'Media aritmetica degli ultimi n prezzi di chiusura. SMA(14) e SMA(20) aiutano a vedere il trend di breve periodo.',
      },
      {
        term: 'EMA (media mobile esponenziale)',
        description:
          'Come la SMA ma pesa di più i prezzi recenti. Reagisce più in fretta ai movimenti del mercato.',
      },
      {
        term: 'RSI (14)',
        formula: 'RSI ∈ [0, 100]',
        description:
          'Indice di forza relativa. Sopra 70 = ipercomprato (possibile correzione); sotto 30 = ipervenduto (possibile rimbalzo).',
      },
      {
        term: 'MACD',
        description:
          'Confronto tra medie esponenziali veloci e lente. Istogramma positivo = momentum rialzista; negativo = ribassista.',
      },
      {
        term: 'Bande di Bollinger (20)',
        formula: 'μ ± 2σ su finestra 20',
        description:
          'Canale attorno alla SMA(20). Prezzo vicino al bordo superiore/inferiore segnala estensione o volatilità.',
      },
      {
        term: 'CCI · Williams %R · Momentum',
        description:
          'CCI(20) e Williams %R(14) usano solo le chiusure (proxy senza massimi/minimi OHLC). Momentum(14) = variazione % su 14 giorni. Utili come filtri nel consiglio operativo.',
      },
      {
        term: 'ATR · Beta · Drawdown',
        description:
          'ATR = media |Δclose| (proxy senza H/L); Beta = Cov(rₐ,rᵦ)/Var(rᵦ) su rendimenti log allineati per data (come ρ); Max drawdown = calo massimo dal picco recente.',
      },
    ],
  },
  {
    id: 'previsioni',
    title: 'Tipi di previsione e calcolo',
    views: ['forecast'],
    items: [
      {
        term: 'Finestra N (media)',
        description:
          'Numero di giorni usati per calcolare la media mobile (2–60). Valori alti = stima più “liscia”, bassi = più reattiva.',
      },
      {
        term: 'Orizzonte (giorni)',
        description:
          'Quanti giorni futuri stimare (1–30). Ogni metodo produce una serie P+1, P+2, … fino all’orizzonte scelto.',
      },
      {
        term: 'Come scegliere il metodo',
        description:
          'Su desktop: griglia con tutti i tipi di calcolo visibili (classici, ML, confronto completo), con anteprima colore grafico e giorni di storico richiesti. Su mobile: tre tab compatti.',
      },
      {
        term: 'SMA + regressione',
        description:
          'Calcola sia la media mobile costante sia la regressione lineare sul trend storico.',
      },
      {
        term: 'Media mobile semplice (SMA)',
        formula: 'Stima giorno k = media ultimi N prezzi',
        description:
          'Assume che il prezzo resti al livello della media recente. Linea verde tratteggiata nel grafico.',
      },
      {
        term: 'Regressione lineare',
        formula: 'y = a·t + b',
        description:
          'Stima il trend sugli ultimi N giorni (stessa finestra della SMA) e lo proietta in avanti. Pendenza (a) = inclinazione giornaliera. Linea arancione tratteggiata nel grafico.',
      },
      {
        term: 'Log-return',
        formula: 'Pₜ₊₁ = Pₜ · e^r̄',
        description:
          'Usa la media dei rendimenti logaritmici giornalieri. Adatto a serie con variazioni percentuali simili nel tempo.',
      },
      {
        term: 'Tutti (classici + ML)',
        description:
          'Esegue SMA, regressione, log-return, ARIMA e LSTM insieme. Consigliato per confrontare metodi statistici e di machine learning.',
      },
      {
        term: 'ARIMA + LSTM',
        description:
          'Solo i motori ML: ARIMA (serie temporale classica) e LSTM (rete ricorrente addestrata sulla serie). Richiedono più storico (18+ e 28+ giorni).',
      },
      {
        term: 'ARIMA',
        formula: 'ARIMA(p,d,q)',
        description:
          'AutoRegressive Integrated Moving Average: modella trend e autocorrelazione nei residui. Ordine (p,d,q) scelto automaticamente.',
      },
      {
        term: 'LSTM',
        description:
          'Long Short-Term Memory: rete neurale leggera addestrata online sui rendimenti log. Linea rosa nel grafico previsioni.',
      },
      {
        term: 'Prezzo reale vs stime',
        description:
          'Nel grafico: indigo = storico; verde = SMA; arancione = regressione; teal = log-return; indaco = Prophet; viola = ARIMA; rosa = LSTM.',
      },
      {
        term: 'ML avanzato (Polinomio · RF)',
        description:
          'Nel passo Prevedi, pannello «ML avanzato»: regressione polinomiale grado 2 e Random Forest dal motore intelligence (sentiment, volatilità, geo).',
      },
      {
        term: 'Finestra N — ambito per metodo',
        description:
          'N controlla SMA e regressione (min 2 giorni). ARIMA/LSTM ignorano N se <18/28 e usano tutta la serie disponibile. Log-return usa l’intera serie per la media dei rendimenti.',
      },
      {
        term: 'Prophet (commodity)',
        formula: 'trend lineare + stagionalità 7 slot',
        description:
          'Versione leggera: stagionalità su indice giorno (non calendario reale). Attivo con metodo commodity o nel dashboard materie prime.',
      },
    ],
  },
  {
    id: 'correlazioni',
    title: 'Correlazioni e benchmark',
    views: ['analysis'],
    items: [
      {
        term: 'ρ (correlazione di Pearson)',
        formula: 'ρ ∈ [-1, +1]',
        description:
          'Misura quanto due serie si muovono insieme. +1 = stesso verso; −1 = opposti; ~0 = nessun legame lineare evidente.',
      },
      {
        term: 'Forte + / Forte −',
        description:
          '|ρ| ≥ 0,7: relazione marcata. Moderata (0,4–0,7) o debole (0,2–0,4) indicano legami parziali.',
      },
      {
        term: 'Confronto asset',
        description:
          'Correlazione dell’asset selezionato vs SPY, QQQ, VIX, oro o peer della stessa categoria — parametri di confronto relativi.',
      },
      {
        term: 'Benchmark macro',
        description:
          'Coppie di mercato (es. S&P500↔VIX, Oro↔Dollaro) per contestualizzare il clima di rischio globale.',
      },
    ],
  },
  {
    id: 'intelligence',
    title: 'Intelligence e contesto globale',
    views: ['analysis'],
    items: [
      {
        term: 'Regime di mercato',
        description:
          'Bull = trend rialzista; Bear = ribassista; Laterale = range; Alta vol. = movimenti ampi; Crisi = stress estremo (VIX/geo).',
      },
      {
        term: 'GIS (indice geopolitico)',
        description:
          'Punteggio da notizie classificate e sentiment NLP. Valori molto negativi aumentano il peso del rischio nelle stime ibride.',
      },
      {
        term: 'Previsione ibrida',
        description:
          'Combina trend tecnico, volatilità (Bollinger/ATR) e impatto geopolitico in un unico scenario numerico.',
      },
      {
        term: 'Sentiment NLP',
        description:
          'Analisi lessicale delle notizie finanziarie: dimensioni paura, incertezza, ottimismo, rischio e volatilità.',
      },
      {
        term: 'Alert intelligenti',
        description:
          'Avvisi automatici quando prezzo, volatilità, regime o notizie superano soglie configurate nel motore di rischio.',
      },
    ],
  },
];

export function sectionsForView(view) {
  return LEGEND_SECTIONS.filter((s) => !s.views?.length || s.views.includes(view));
}

export function defaultOpenSection(view) {
  const map = {
    explore: 'navigazione',
    analysis: 'analisi',
    forecast: 'previsioni',
  };
  return map[view] ?? 'navigazione';
}
