import { sma, bollinger } from '../indicators.js';

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
    });
  }

  if (risk?.atr?.pctOfPrice != null && risk.atr.pctOfPrice > 3) {
    alerts.push({
      level: 'warning',
      type: 'volatility',
      message: `Volatilità elevata (ATR ${risk.atr.pctOfPrice}% del prezzo)`,
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
      });
    }
    if (prev20 && prev50 && prev20 >= prev50 && sma20 < sma50) {
      alerts.push({
        level: 'warning',
        type: 'technical',
        message: 'Incrocio ribassista SMA20 / SMA50',
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
      });
    }
    if (last <= bb.lower * 1.002) {
      alerts.push({
        level: 'info',
        type: 'bollinger',
        message: 'Prezzo alla banda inferiore di Bollinger',
      });
    }
  }

  if (geoImpact?.topEvents?.length) {
    const high = geoImpact.topEvents.filter((e) => Math.abs(e.impact) > 0.35);
    for (const ev of high.slice(0, 2)) {
      alerts.push({
        level: 'critical',
        type: 'geopolitical',
        message: `Evento ad alto impatto: ${ev.event} — ${ev.title?.slice(0, 80)}`,
      });
    }
  }

  if (risk?.vix?.price != null && risk.vix.price > 28) {
    alerts.push({
      level: 'warning',
      type: 'vix',
      message: `VIX elevato (${Number(risk.vix.price).toFixed(1)}) — mercato in modalità risk-off`,
    });
  }

  if (regime?.regime === 'crisis') {
    alerts.push({
      level: 'critical',
      type: 'regime',
      message: `Regime di mercato: ${regime.label}`,
    });
  }

  if (hybrid?.combined && last) {
    const pct = ((hybrid.combined - last) / last) * 100;
    if (Math.abs(pct) > 5) {
      alerts.push({
        level: 'info',
        type: 'forecast',
        message: `Previsione ibrida ${pct > 0 ? '+' : ''}${pct.toFixed(1)}% vs ultimo prezzo`,
      });
    }
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.level] ?? 3) - (order[b.level] ?? 3);
  });
}
