/**
 * Verifica notifiche multi-canale — node scripts/verify-notify.js
 * Offline: senza env i canali fanno short-circuit (skipped), nessuna rete.
 */
import {
  buildAlertMessages,
  dispatchPortfolioAlert,
  alertDelivered,
  explainTrigger,
} from '../lib/notifications/index.js';
import { isValidSlackWebhook, sendSlack } from '../lib/notifications/slack.js';
import { sendEmail, isEmailConfigured } from '../lib/notifications/email.js';
import { generateIntelligentAlerts } from '../lib/alerts/intelligentAlerts.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

const args = {
  symbol: 'AAPL',
  plPercent: 12.34,
  currentValue: 190.5,
  avgPrice: 170,
  currentPrice: 190.5,
  pl: 41,
  quantity: 2,
  threshold: 10,
  kind: 'gain',
  currency: 'USD',
  sparkPoints: [{ price: 180 }, { price: 185 }, { price: 190.5 }],
  createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
};

// ── buildAlertMessages ───────────────────────────────────────────────
const m = buildAlertMessages(args);
assert(typeof m.telegram === 'string' && m.telegram.includes('<b>'), 'telegram = HTML');
assert(typeof m.whatsapp === 'string' && !/<[^>]+>/.test(m.whatsapp), 'whatsapp = testo piano');
assert(m.slack === m.whatsapp, 'slack riusa il testo piano');
assert(m.email && m.email.subject.includes('AAPL'), 'email subject contiene il simbolo');
assert(m.email.html.includes('<div'), 'email html è un template');
assert(m.email.html.includes('<br>'), 'email html converte i newline in <br>');
assert(m.email.text === m.whatsapp, 'email text = piano');

// ── Spiegazione contestuale del trigger ("perché è scattato") ─────────
assert(m.telegram.includes('Perché è scattato'), 'messaggio include la sezione spiegazione');
assert(m.telegram.includes('💡'), 'messaggio include il suggerimento');
assert(m.telegram.includes('Prezzo: '), 'messaggio include il prezzo corrente');

const gainExp = explainTrigger(args);
assert(Array.isArray(gainExp.lines) && gainExp.lines.length >= 3, 'gain: ≥3 righe di contesto');
assert(
  gainExp.lines[0].includes('superata di 2.34 punti'),
  'gain: calcola la distanza dalla soglia'
);
assert(gainExp.lines.some((l) => l.includes('su 2 unità')), 'gain: P/L assoluto su quantità');
assert(gainExp.lines.some((l) => l.includes('↗')), 'gain: trend recente in salita');
assert(gainExp.lines.some((l) => l.includes('5 giorni')), 'gain: holding period');
assert(/consolidare|stop/i.test(gainExp.suggestion), 'gain: suggerimento coerente');

const lossExp = explainTrigger({
  ...args,
  plPercent: -12,
  threshold: -8,
  kind: 'loss',
  pl: -40,
  currentPrice: 149.6,
  sparkPoints: [{ price: 170 }, { price: 160 }, { price: 149.6 }],
});
assert(lossExp.lines[0].includes('Soglia di perdita -8%'), 'loss: soglia perdita nel testo');
assert(lossExp.lines.some((l) => l.includes('↘')), 'loss: trend in discesa');
assert(/tesi|stop|perdite/i.test(lossExp.suggestion), 'loss: suggerimento coerente');

// Robustezza: senza i campi extra non deve rompersi.
const minimal = explainTrigger({ plPercent: 12, threshold: 10, kind: 'gain' });
assert(minimal.lines.length >= 1 && minimal.suggestion, 'explainTrigger robusto senza campi extra');

// ── Avvisi intelligenti di mercato (detail + suggestion) ─────────────
const intel = generateIntelligentAlerts({
  prices: Array.from({ length: 60 }, (_, i) => 100 + i * 0.5),
  sentimentSummary: { negative: 6, positive: 0 },
  risk: { atr: { pctOfPrice: 4.2 }, vix: { price: 31 } },
  regime: { regime: 'crisis', label: 'Crisi' },
  hybrid: { combined: 200 },
});
assert(intel.length > 0, 'genera avvisi intelligenti');
assert(
  intel.every((a) => a.message && a.detail && a.suggestion),
  'ogni avviso ha message + detail + suggestion'
);
assert(intel[0].level === 'critical', 'ordinamento per severità (critical prima)');

// ── Slack helper ─────────────────────────────────────────────────────
assert(
  isValidSlackWebhook('https://hooks.slack.com/services/T000/B000/xyzABC123'),
  'webhook Slack valido riconosciuto'
);
assert(!isValidSlackWebhook('https://example.com/hook'), 'webhook non-Slack rifiutato');
assert(!isValidSlackWebhook(''), 'webhook vuoto rifiutato');

// ── Adapter short-circuit (nessuna rete se non configurati) ──────────
const slackSkip = await sendSlack('', 'ciao');
assert(slackSkip.ok === false && slackSkip.skipped === true, 'sendSlack senza URL → skipped');

const emailSkip = await sendEmail('a@b.com', { subject: 's', text: 't' });
assert(
  emailSkip.ok === false && emailSkip.skipped === true,
  'sendEmail senza provider → skipped'
);
assert(isEmailConfigured() === false, 'isEmailConfigured false senza env');

// ── Dispatch: selezione canali per campi utente ──────────────────────
const none = await dispatchPortfolioAlert({}, m);
assert(
  none.telegram === null && none.whatsapp === null && none.slack === null && none.email === null,
  'utente senza canali → nessun invio'
);
assert(alertDelivered(none) === false, 'nessun canale → non consegnato');

const onlyTg = await dispatchPortfolioAlert({ telegram_chat_id: '123' }, m);
assert(onlyTg.telegram && onlyTg.telegram.ok === false, 'telegram tentato ma non configurato');
assert(onlyTg.slack === null && onlyTg.email === null, 'altri canali non tentati');

const emailUser = await dispatchPortfolioAlert({ email_alerts: true, email: 'a@b.com' }, m);
assert(emailUser.email && emailUser.email.skipped === true, 'email tentata (skipped senza provider)');

const emailOff = await dispatchPortfolioAlert({ email_alerts: false, email: 'a@b.com' }, m);
assert(emailOff.email === null, 'email non tentata se email_alerts=false');

const slackUser = await dispatchPortfolioAlert({ slack_webhook_url: '' }, m);
assert(slackUser.slack === null, 'slack non tentato con webhook vuoto');

if (failed) {
  console.error(`\n${failed} test falliti`);
  process.exit(1);
}
console.log('\nTutti i controlli notifiche passati.');
