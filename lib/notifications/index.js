import { sendTelegram } from './telegram.js';
import { sendWhatsApp } from './whatsapp.js';
import { sendWebPush } from './webpush.js';
import { sendSlack } from './slack.js';
import { sendEmail, buildAlertEmailHtml } from './email.js';
import { escapeHtml, sanitizeSymbol } from '../htmlEscape.js';
import { trendFromSpark } from './sparkTrend.js';

/**
 * Invia alert portfolio su tutti i canali configurati
 * (Telegram, WhatsApp, Slack, Email, Web Push).
 * @param {{ telegram_chat_id?: string, whatsapp_number?: string, slack_webhook_url?: string,
 *   email?: string, email_alerts?: boolean, pushSubscriptions?: Array }} user
 * @param {{ telegram?: string, whatsapp?: string, slack?: string,
 *   email?: { subject: string, html?: string, text?: string }, push?: object }} messages
 * @returns {{ telegram, whatsapp, slack, email, push: { sent: number }, expiredEndpoints: string[] }}
 */
export async function dispatchPortfolioAlert(user, messages) {
  const results = {
    telegram: null,
    whatsapp: null,
    slack: null,
    email: null,
    push: null,
    expiredEndpoints: [],
  };
  const telegramText = messages.telegram ?? messages.whatsapp;
  const whatsappText = messages.whatsapp ?? messages.telegram;
  const slackText = messages.slack ?? whatsappText;

  if (user.telegram_chat_id && telegramText) {
    try {
      results.telegram = await sendTelegram(user.telegram_chat_id, telegramText);
    } catch (err) {
      results.telegram = { ok: false, error: err.message };
      console.warn('[notify] Telegram:', err.message);
    }
  }

  const subs =
    user.push_alerts_enabled !== false ? (user.pushSubscriptions ?? []) : [];
  const whatsappTarget = user.whatsapp_number || user.phone_number;

  if (whatsappTarget && whatsappText) {
    try {
      results.whatsapp = await sendWhatsApp(whatsappTarget, whatsappText);
    } catch (err) {
      results.whatsapp = { ok: false, error: err.message };
      console.warn('[notify] WhatsApp:', err.message);
    }
  }

  if (user.slack_webhook_url && slackText) {
    try {
      results.slack = await sendSlack(user.slack_webhook_url, slackText);
    } catch (err) {
      results.slack = { ok: false, error: err.message };
      console.warn('[notify] Slack:', err.message);
    }
  }

  if (user.email_alerts && user.email && messages.email) {
    try {
      results.email = await sendEmail(user.email, messages.email);
    } catch (err) {
      results.email = { ok: false, error: err.message };
      console.warn('[notify] Email:', err.message);
    }
  }

  if (subs.length) {
    const payload = messages.push ?? {
      title: 'Market Monitor — Alert Portfolio',
      body: whatsappText,
      icon: '/app-icon-light-192.png',
      badge: '/app-icon.svg',
      tag: 'portfolio-alert',
      requireInteraction: true,
      url: '/?view=portfolio',
      urgency: 'high',
      ttl: 86400,
      data: { url: '/?view=portfolio', action: 'open' },
    };
    let sent = 0;
    for (const sub of subs) {
      const res = await sendWebPush(sub, payload, {
        ttl: payload.ttl,
        urgency: payload.urgency,
      });
      if (res.ok) sent += 1;
      else if (res.gone) results.expiredEndpoints.push(sub.endpoint);
    }
    results.push = { sent };
  }

  return results;
}

/** True se almeno un canale ha consegnato il messaggio. */
export function alertDelivered(results) {
  return Boolean(
    results?.telegram?.ok === true ||
      results?.whatsapp?.ok === true ||
      results?.slack?.ok === true ||
      results?.email?.ok === true ||
      (results?.push?.sent ?? 0) > 0
  );
}

function formatMoneyAlert(value, currency = 'USD') {
  if (value == null || !Number.isFinite(value)) return '—';
  const ccy = String(currency).toUpperCase();
  const symbol = ccy === 'EUR' ? '€' : ccy === 'USD' ? '$' : `${ccy} `;
  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(Number(value)).toFixed(2)}`;
}

/** Direzione del trend dalle ultime rilevazioni (sparkline). */
export { trendFromSpark } from './sparkTrend.js';

/** Giorni interi di apertura della posizione. */
function holdingDays(createdAt) {
  if (!createdAt) return null;
  const ms = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 86400000);
}

/**
 * Spiega perché l'alert è scattato: righe di contesto con i numeri
 * (distanza dalla soglia, P/L assoluto, movimento di prezzo, trend, holding)
 * più un suggerimento operativo. Tutti i campi extra sono opzionali.
 * @returns {{ lines: string[], suggestion: string }}
 */
export function explainTrigger({
  plPercent,
  avgPrice,
  currentPrice,
  pl,
  quantity,
  threshold,
  kind,
  currency = 'USD',
  sparkPoints,
  createdAt,
}) {
  const gain = kind === 'gain';
  const plPct = Number(plPercent);
  const beyond = Math.abs(plPct - Number(threshold)).toFixed(2);
  const lines = [];

  lines.push(
    gain
      ? `Soglia di guadagno +${threshold}% superata di ${beyond} punti (P/L ${plPct.toFixed(2)}%).`
      : `Soglia di perdita ${threshold}% raggiunta di ${beyond} punti (P/L ${plPct.toFixed(2)}%).`
  );

  if (pl != null && Number.isFinite(Number(pl)) && quantity != null) {
    lines.push(
      `${gain ? 'Guadagno' : 'Perdita'} attuale ${formatMoneyAlert(pl, currency)} su ${quantity} unità.`
    );
  }

  if (
    currentPrice != null &&
    Number.isFinite(Number(currentPrice)) &&
    avgPrice != null &&
    Number.isFinite(Number(avgPrice))
  ) {
    lines.push(
      `Prezzo ${gain ? 'salito' : 'sceso'} da ${formatMoneyAlert(avgPrice, currency)} (PM) ` +
        `a ${formatMoneyAlert(currentPrice, currency)}.`
    );
  }

  const trend = trendFromSpark(sparkPoints);
  if (trend) {
    lines.push(
      `Trend recente: ${trend.arrow} ${trend.label} ` +
        `(${trend.pct > 0 ? '+' : ''}${trend.pct.toFixed(1)}% sulle ultime rilevazioni).`
    );
  }

  const days = holdingDays(createdAt);
  if (days != null && days >= 1) {
    lines.push(`Posizione aperta da ${days} ${days === 1 ? 'giorno' : 'giorni'}.`);
  }

  const suggestion = gain
    ? 'Valuta se consolidare parte del guadagno o alzare lo stop di protezione.'
    : 'Rivedi la tesi d’investimento o imposta uno stop per limitare le perdite.';

  return { lines, suggestion };
}

export function formatAlertMessage(args) {
  const { symbol, plPercent, currentValue, avgPrice, currentPrice, threshold, kind, currency = 'USD' } =
    args;
  const safeSymbol = escapeHtml(sanitizeSymbol(symbol));
  const pct = Number(plPercent).toFixed(2);
  const arrow = kind === 'gain' ? '📈' : '📉';
  const label = kind === 'gain' ? 'soglia guadagno' : 'soglia perdita';
  const pricePart =
    currentPrice != null && Number.isFinite(Number(currentPrice))
      ? ` | Prezzo: ${formatMoneyAlert(currentPrice, currency)}`
      : '';

  const { lines, suggestion } = explainTrigger(args);
  const why = lines.map((l) => `• ${escapeHtml(l)}`).join('\n');

  return (
    `${arrow} <b>Market Monitor — Alert Portfolio</b>\n` +
    `<b>${safeSymbol}</b>: P/L ${pct}% (${label} ${threshold}%)\n` +
    `Valore: ${formatMoneyAlert(currentValue, currency)} | PM: ${formatMoneyAlert(avgPrice, currency)}${pricePart}\n\n` +
    `<b>Perché è scattato</b>\n${why}\n💡 ${escapeHtml(suggestion)}`
  );
}

export function formatAlertMessagePlain(args) {
  return formatAlertMessage(args)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ');
}

/** Payload strutturato per Web Push (icona, azioni, deep link, persistenza OS). */
export function buildPushPayload(args) {
  const symbol = sanitizeSymbol(args.symbol);
  const url = `/?view=portfolio&symbol=${encodeURIComponent(symbol)}`;
  const kind = args.kind || 'gain';

  if (kind === 'forecast') {
    const dir = args.direction === 'up' ? '📈' : '📉';
    const pct = Number(args.trendPct).toFixed(1);
    return {
      title: `${dir} Previsione: ${symbol}`,
      body: `${symbol}: trend ${args.trendLabel} (${pct > 0 ? '+' : ''}${pct}%)`,
      icon: '/app-icon-light-192.png',
      badge: '/app-icon.svg',
      tag: `portfolio-forecast-${symbol}`,
      requireInteraction: true,
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200],
      urgency: 'high',
      ttl: 86400,
      url,
      actions: [
        { action: 'open', title: 'Apri Portfolio' },
        { action: 'dismiss', title: 'Ignora' },
      ],
      data: { url, action: 'open', symbol, kind: 'forecast', trendPct: pct },
    };
  }

  if (kind === 'advice') {
    const icon = args.action === 'sell' || args.action === 'reduce' ? '⚠️' : '💡';
    return {
      title: `${icon} Consiglio: ${symbol}`,
      body: args.summary || args.actionLabel || 'Nuovo consiglio sul tuo portafoglio',
      icon: '/app-icon-light-192.png',
      badge: '/app-icon.svg',
      tag: `portfolio-advice-${symbol}-${args.action}`,
      requireInteraction: true,
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200],
      urgency: 'high',
      ttl: 86400,
      url,
      actions: [
        { action: 'open', title: 'Vedi dettaglio' },
        { action: 'dismiss', title: 'Ignora' },
      ],
      data: { url, action: 'open', symbol, kind: 'advice', adviceAction: args.action },
    };
  }

  const plain = formatAlertMessagePlain(args);
  const pct = Number(args.plPercent).toFixed(2);
  const arrow = kind === 'gain' ? '📈' : '📉';
  return {
    title: `${arrow} Alert Portfolio: ${symbol}`,
    body: `${symbol} P/L ${pct}% — tocca per aprire il portfolio`,
    icon: '/app-icon-light-192.png',
    badge: '/app-icon.svg',
    tag: `portfolio-alert-${symbol}-${kind}`,
    requireInteraction: true,
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    urgency: 'high',
    ttl: 86400,
    url,
    actions: [
      { action: 'open', title: 'Apri Portfolio' },
      { action: 'dismiss', title: 'Ignora' },
    ],
    data: {
      url,
      action: 'open',
      symbol,
      kind,
      plPercent: pct,
    },
  };
}

/**
 * Costruisce i messaggi per tutti i canali a partire dai dati dell'alert.
 * @returns {{ telegram, whatsapp, slack, email, push }}
 */
export function buildAlertMessages(args) {
  const html = formatAlertMessage(args);
  const plain = formatAlertMessagePlain(args);
  const pct = Number(args.plPercent).toFixed(2);
  const arrow = args.kind === 'gain' ? '📈' : '📉';
  const subject = `${arrow} ${sanitizeSymbol(args.symbol)} ${pct}% — Market Monitor Alert`;
  return {
    telegram: html,
    whatsapp: plain,
    slack: plain,
    email: { subject, html: buildAlertEmailHtml(html), text: plain },
    push: buildPushPayload(args),
  };
}

function formatMoneyBrief(value, currency = 'USD') {
  return formatMoneyAlert(value, currency);
}

/** Messaggi alert previsione trend (sparkline). */
export function buildForecastAlertMessages(args) {
  const symbol = sanitizeSymbol(args.symbol);
  const pct = Number(args.trendPct).toFixed(1);
  const dir = args.direction === 'up' ? '📈' : '📉';
  const safeSymbol = escapeHtml(symbol);
  const html =
    `${dir} <b>Market Monitor — Previsione breve termine</b>\n` +
    `<b>${safeSymbol}</b>: movimento ${escapeHtml(args.trendLabel)} (${pct > 0 ? '+' : ''}${pct}%)\n` +
    (args.currentPrice != null
      ? `Prezzo attuale: ${formatMoneyBrief(args.currentPrice, args.currency)}\n`
      : '') +
    (args.plPercent != null ? `P/L posizione: ${Number(args.plPercent).toFixed(2)}%\n` : '') +
    `\n💡 Basato sul trend delle ultime rilevazioni. Verifica nel portfolio.`;
  const plain = html.replace(/<[^>]+>/g, '');
  const subject = `${dir} Previsione ${symbol} ${pct}% — Market Monitor`;
  return {
    telegram: html,
    whatsapp: plain,
    slack: plain,
    email: { subject, html: buildAlertEmailHtml(html), text: plain },
    push: buildPushPayload({ ...args, kind: 'forecast' }),
  };
}

/** Messaggi alert consiglio operativo (vendita/riduzione/accumulo). */
export function buildAdviceAlertMessages(args) {
  const symbol = sanitizeSymbol(args.symbol);
  const safeSymbol = escapeHtml(symbol);
  const icon = args.action === 'sell' || args.action === 'reduce' ? '⚠️' : '💡';
  const html =
    `${icon} <b>Market Monitor — Consiglio operativo</b>\n` +
    `<b>${safeSymbol}</b>: <b>${escapeHtml(args.actionLabel)}</b>\n` +
    `${escapeHtml(args.summary)}\n` +
    (args.plPercent != null ? `P/L attuale: ${Number(args.plPercent).toFixed(2)}%\n` : '') +
    `\nNon costituisce consulenza finanziaria. Valuta sempre il tuo profilo di rischio.`;
  const plain = html.replace(/<[^>]+>/g, '');
  const subject = `${icon} ${args.actionLabel} ${symbol} — Market Monitor`;
  return {
    telegram: html,
    whatsapp: plain,
    slack: plain,
    email: { subject, html: buildAlertEmailHtml(html), text: plain },
    push: buildPushPayload({ ...args, kind: 'advice' }),
  };
}
