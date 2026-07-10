import { sma, bollinger } from '../indicators.js';

/** Formatta un numero con decimali fissi, gestendo null. */
function n(value, decimals = 2) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(decimals);
}

/**
 * Genera alert di mercato contestuali: oltre al titolo (`message`) ogni alert
 * include `detail` (spiegazione con i numeri che l'hanno fatto scattare) e
 * `suggestion` (cosa valutare), così l'utente capisce *perché* e *cosa fare*.
 */
export function generateIntelligentAlerts({
  prices,
  sentimentSummary,
  geoImpact,
  risk,
  regime,
  hybrid,
}) {
  const alerts = [];
  const last = prices?.[prices.length - 1];

  if (sentimentSummary?.negative >= 5 && sentimentSummary.positive <= 1) {
    alerts.push({
      level: 'warning',
      type: 'sentiment',
      message: 'Sentiment negativo improvviso sulle notizie geopolitiche',
      detail:
        `${sentimentSummary.negative} notizie negative contro ` +
        `${sentimentSummary.positive} positive nelle ultime rilevazioni: ` +
        'il flusso informativo è sbilanciato al ribasso.',
      suggestion:
        'Il sentiment estremo spesso anticipa volatilità: verifica le news chiave prima di operare.',
    });
  }

  if (risk?.atr?.pctOfPrice != null && risk.atr.pctOfPrice > 3) {
    alerts.push({
      level: 'warning',
      type: 'volatility',
      message: `Volatilità elevata (ATR ${risk.atr.pctOfPrice}% del prezzo)`,
      detail:
        `L'ATR vale il ${risk.atr.pctOfPrice}% del prezzo (soglia 3%): ` +
        'le oscillazioni giornaliere attese sono ampie.',
      suggestion:
        'Riduci la dimensione della posizione o allarga gli stop per assorbire lo swing.',
    });
  }

  const sma20 = sma(prices, 20);
  const sma50 = sma(prices, 50);
  if (sma20 && sma50 && last) {
    const prev20 = sma(prices.slice(0, -1), 20);
    const prev50 = sma(prices.slice(0, -1), 50);
    if (prev20 && prev50 && prev20 <= prev50 && sma20 > sma50) {
      alerts.push({
        level: 'info',
        type: 'technical',
        message: 'Incrocio rialzista SMA20 / SMA50',
        detail:
          `La media a 20 (${n(sma20)}) ha superato quella a 50 (${n(sma50)}): ` +
          'golden cross, segnale di forza nel breve.',
        suggestion: 'Conferma il segnale con i volumi prima di aumentare l’esposizione.',
      });
    }
    if (prev20 && prev50 && prev20 >= prev50 && sma20 < sma50) {
      alerts.push({
        level: 'warning',
        type: 'technical',
        message: 'Incrocio ribassista SMA20 / SMA50',
        detail:
          `La media a 20 (${n(sma20)}) è scesa sotto quella a 50 (${n(sma50)}): ` +
          'death cross, indebolimento del trend di breve.',
        suggestion: 'Valuta coperture o una riduzione del rischio se il trend prosegue.',
      });
    }
  }

  const bb = bollinger(prices, 20);
  if (bb && last) {
    if (last >= bb.upper * 0.998) {
      alerts.push({
        level: 'warning',
        type: 'bollinger',
        message: 'Prezzo alla banda superiore di Bollinger (possibile ipercomprato)',
        detail:
          `Prezzo ${n(last)} a ridosso della banda superiore ${n(bb.upper)} ` +
          `(media ${n(bb.middle)}): estensione sopra la norma.`,
        suggestion: 'Possibile ipercomprato: attendi un rientro o valuta prese di profitto parziali.',
      });
    }
    if (last <= bb.lower * 1.002) {
      alerts.push({
        level: 'info',
        type: 'bollinger',
        message: 'Prezzo alla banda inferiore di Bollinger',
        detail:
          `Prezzo ${n(last)} a ridosso della banda inferiore ${n(bb.lower)} ` +
          `(media ${n(bb.middle)}): compressione sotto la norma.`,
        suggestion: 'Possibile ipervenduto: cerca conferme di rimbalzo, non anticipare il minimo.',
      });
    }
  }

  if (geoImpact?.topEvents?.length) {
    const high = geoImpact.topEvents.filter((e) => Math.abs(e.impact) > 0.35);
    for (const ev of high.slice(0, 2)) {
      const dir = ev.impact > 0 ? 'positivo' : 'negativo';
      alerts.push({
        level: 'critical',
        type: 'geopolitical',
        message: `Evento ad alto impatto: ${ev.event} — ${ev.title?.slice(0, 80)}`,
        detail:
          `Impatto stimato ${dir} del ${n(Math.abs(ev.impact) * 100, 0)}% sull'asset ` +
          'in base al modello geopolitico.',
        suggestion:
          'Gli eventi ad alto impatto muovono i prezzi rapidamente: monitora gli sviluppi e la liquidità.',
      });
    }
  }

  if (risk?.vix?.price != null && risk.vix.price > 28) {
    alerts.push({
      level: 'warning',
      type: 'vix',
      message: `VIX elevato (${n(risk.vix.price, 1)}) — mercato in modalità risk-off`,
      detail:
        `Il VIX è a ${n(risk.vix.price, 1)}, sopra la soglia di stress di 28: ` +
        'la volatilità implicita è alta.',
      suggestion: 'Contesto risk-off: privilegia asset difensivi e dimensiona con prudenza.',
    });
  }

  if (regime?.regime === 'crisis') {
    alerts.push({
      level: 'critical',
      type: 'regime',
      message: `Regime di mercato: ${regime.label}`,
      detail:
        `Il modello classifica la fase attuale come "${regime.label}": ` +
        'condizioni di stress diffuso.',
      suggestion: 'In crisi le correlazioni salgono: la diversificazione protegge meno del solito.',
    });
  }

  if (hybrid?.combined && last) {
    const pct = ((hybrid.combined - last) / last) * 100;
    if (Math.abs(pct) > 5) {
      const up = pct > 0;
      alerts.push({
        level: 'info',
        type: 'forecast',
        message: `Previsione ibrida ${up ? '+' : ''}${pct.toFixed(1)}% vs ultimo prezzo`,
        detail:
          `Il modello ibrido stima ${n(hybrid.combined)} contro l'ultimo prezzo ${n(last)} ` +
          `(${up ? '+' : ''}${pct.toFixed(1)}% sull'orizzonte).`,
        suggestion: up
          ? 'Scenario costruttivo secondo il modello: valuta l’ingresso solo con conferme di prezzo.'
          : 'Scenario prudente secondo il modello: gestisci il rischio ed evita esposizioni eccessive.',
      });
    }
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.level] ?? 3) - (order[b.level] ?? 3);
  });
}
