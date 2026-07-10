import { ensureSchema, getDb, isDbConfigured } from '../db.js';
import bcrypt from 'bcryptjs';
import { loginUser, registerUser, requireAuth, refreshAccessToken, revokeRefreshTokens, getUserProfile } from './auth.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  sendTokenResponse,
} from './authCookies.js';
import { verifyEmailByToken, resendVerificationForUser } from './emailVerification.js';
import { runPortfolioMonitor } from './monitor.js';
import { consume, clientIp } from '../rateLimit.js';
import { savePushSubscription, deletePushByEndpoint } from './push.js';
import { getVapidPublicKey, isWebPushConfigured } from '../notifications/webpush.js';
import { isEmailConfigured } from '../notifications/email.js';
import { getDashboardLayout, saveDashboardLayout } from '../userPrefs.js';
import { listAuditLog } from '../auditLog.js';
import { loginWithOAuth, isOAuthConfigured, getOAuthPublicConfig } from '../auth/oauth.js';
import { isAuth0Enabled, getAuth0PublicConfig } from '../auth/auth0.js';
import {
  webauthnRegisterOptions,
  webauthnRegisterVerify,
  webauthnLoginOptions,
  webauthnLoginVerify,
  isWebAuthnConfigured,
} from '../auth/webauthn.js';
import { suggestRebalance } from '../portfolio/rebalance.js';
import { findTaxLossCandidates } from '../portfolio/taxLoss.js';
import {
  registerOutboundWebhook,
  listOutboundWebhooks,
  deleteOutboundWebhook,
} from '../webhooks/outbound.js';
import { getPaperAccount, paperTrade, getPaperTrades } from '../paper/service.js';
import {
  addAsset,
  addTransaction,
  getAssetDetail,
  getAssets,
  getDashboard,
  getPortfolioHistory,
  registerTelegram,
  registerWhatsApp,
  registerSlack,
  setEmailAlerts,
  getNotificationPreferences,
  updateNotificationPreferences,
  updateAssetAlerts,
} from './service.js';

function dbUnavailable(res) {
  return res.status(503).json({
    error: 'Portfolio non disponibile: configura DATABASE_URL (NeonDB) nel server.',
  });
}

async function withDb(req, res, next) {
  if (!isDbConfigured()) return dbUnavailable(res);
  try {
    await ensureSchema();
    next();
  } catch (err) {
    console.error('[portfolio] schema:', err.message);
    res.status(500).json({ error: 'Errore inizializzazione database' });
  }
}

function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return res.status(503).json({ error: 'CRON_SECRET non configurato' });
  }
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${secret}` && req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }
  next();
}

// Anti brute-force sugli endpoint auth: bucket dedicato più stretto (per IP),
// indipendente dal limiter tier-based globale.
function rateLimitAuth(route) {
  const windowMs = 15 * 60 * 1000;
  const max = 30;
  return (req, res, next) => {
    const key = `auth:${route}:${clientIp(req)}`;
    const r = consume(key, { windowMs, max });
    res.set('RateLimit-Limit', String(r.limit));
    res.set('RateLimit-Remaining', String(r.remaining));
    res.set('RateLimit-Reset', String(r.resetSeconds));
    if (!r.allowed) {
      res.set('Retry-After', String(r.resetSeconds));
      return res.status(429).json({
        error: 'Troppe richieste. Riprova tra qualche minuto.',
        retryAfter: r.resetSeconds,
      });
    }
    next();
  };
}

export function mountPortfolioRoutes(app, deps) {
  app.post('/api/auth/register', withDb, rateLimitAuth('register'), async (req, res) => {
    try {
      const { email, password, phoneNumber, notificationPrefs } = req.body ?? {};
      const result = await registerUser(email, password, { phoneNumber, notificationPrefs });
      res.status(201).json(sendTokenResponse(res, result));
    } catch (err) {
      const msg = err.message || 'Registrazione fallita';
      const status = msg.includes('già registrata') || msg.includes('duplicate') ? 409 : 400;
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/auth/login', withDb, rateLimitAuth('login'), async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      const result = await loginUser(email, password);
      res.json(sendTokenResponse(res, result));
    } catch (err) {
      res.status(401).json({ error: err.message || 'Login fallito' });
    }
  });

  app.get('/api/auth/me', withDb, requireAuth, async (req, res) => {
    try {
      const user = await getUserProfile(req.userId);
      res.json({ user });
    } catch (err) {
      res.status(404).json({ error: err.message || 'Utente non trovato' });
    }
  });

  app.get('/api/auth/config', (_req, res) => {
    const pub = getOAuthPublicConfig();
    const auth0 = getAuth0PublicConfig();
    res.json({
      auth0: {
        enabled: isAuth0Enabled(),
        domain: auth0.domain,
        clientId: auth0.clientId,
        audience: auth0.audience,
        mfa: auth0.mfaEnabled,
      },
      oauth: {
        google: isOAuthConfigured('google'),
        github: isOAuthConfigured('github'),
      },
      oauthClientIds: {
        google: pub.google || null,
        github: pub.github || null,
      },
      webauthn: isWebAuthnConfigured(),
    });
  });

  app.post('/api/auth/oauth/:provider', withDb, rateLimitAuth('oauth'), async (req, res) => {
    try {
      const { token, code, redirectUri } = req.body ?? {};
      const result = await loginWithOAuth(req.params.provider, token || code, {
        code: code || undefined,
        redirectUri,
      });
      res.json(sendTokenResponse(res, result));
    } catch (err) {
      res.status(401).json({ error: err.message || 'OAuth fallito' });
    }
  });

  app.post('/api/auth/webauthn/register/options', withDb, requireAuth, async (req, res) => {
    try {
      const db = getDb();
      const users = await db`SELECT email FROM users WHERE id = ${req.userId} LIMIT 1`;
      const options = await webauthnRegisterOptions(req.userId, users[0]?.email);
      res.json(options);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/webauthn/register/verify', withDb, requireAuth, async (req, res) => {
    try {
      const result = await webauthnRegisterVerify(req.userId, req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/webauthn/login/options', withDb, rateLimitAuth('webauthn'), async (req, res) => {
    try {
      const { email } = req.body ?? {};
      const { options, userId } = await webauthnLoginOptions(email);
      res.json({ options, userId });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/webauthn/login/verify', withDb, rateLimitAuth('webauthn'), async (req, res) => {
    try {
      const { userId, response } = req.body ?? {};
      const result = await webauthnLoginVerify(userId, response);
      res.json(sendTokenResponse(res, result));
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  });

  app.get('/api/auth/audit', withDb, requireAuth, async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const events = await listAuditLog(req.userId, limit);
      res.json({ events });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/user/dashboard-layout', withDb, requireAuth, async (req, res) => {
    try {
      const { layout, source } = await getDashboardLayout(req.userId);
      res.json({ layout, source });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/user/dashboard-layout', withDb, requireAuth, async (req, res) => {
    try {
      const { layout } = req.body ?? {};
      const saved = await saveDashboardLayout(req.userId, layout);
      res.json({ layout: saved });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/refresh', withDb, rateLimitAuth('refresh'), async (req, res) => {
    try {
      const refreshToken = req.body?.refreshToken || readRefreshCookie(req);
      const tokens = await refreshAccessToken(refreshToken);
      res.json(sendTokenResponse(res, tokens));
    } catch (err) {
      res.status(401).json({ error: err.message || 'Refresh fallito' });
    }
  });

  app.get('/api/auth/verify-email', withDb, async (req, res) => {
    try {
      const token = String(req.query.token || '').trim();
      const result = await verifyEmailByToken(token);
      res.json({ ok: true, email: result.email });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Verifica fallita' });
    }
  });

  app.post('/api/auth/resend-verification', withDb, requireAuth, async (req, res) => {
    try {
      const result = await resendVerificationForUser(req.userId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/logout', withDb, requireAuth, async (req, res) => {
    try {
      await revokeRefreshTokens(req.userId);
      clearRefreshCookie(res);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/portfolio/addAsset', withDb, requireAuth, async (req, res) => {
    try {
      const { symbol, assetType, quantity, avgPrice, alertGain, alertLoss } = req.body ?? {};
      if (!symbol) return res.status(400).json({ error: 'symbol richiesto' });
      const result = await addAsset(req.userId, {
        symbol,
        assetType,
        quantity,
        avgPrice,
        alertGain,
        alertLoss,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/portfolio/updateAlerts/:symbol', withDb, requireAuth, async (req, res) => {
    try {
      const { alertGain, alertLoss } = req.body ?? {};
      const asset = await updateAssetAlerts(req.userId, req.params.symbol, {
        alertGain,
        alertLoss,
      });
      res.json({
        symbol: asset.symbol,
        alertGain: asset.alert_gain != null ? Number(asset.alert_gain) : null,
        alertLoss: asset.alert_loss != null ? Number(asset.alert_loss) : null,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/portfolio/addTransaction', withDb, requireAuth, async (req, res) => {
    try {
      const { symbol, assetType, type, quantity, price } = req.body ?? {};
      if (!symbol || !type) {
        return res.status(400).json({ error: 'symbol e type richiesti' });
      }
      const result = await addTransaction(req.userId, {
        symbol,
        assetType,
        type,
        quantity,
        price,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/portfolio/getAssets', withDb, requireAuth, async (req, res) => {
    try {
      const assets = await getAssets(req.userId, deps);
      res.json({ assets });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/portfolio/getAsset/:symbol', withDb, requireAuth, async (req, res) => {
    try {
      const detail = await getAssetDetail(req.userId, req.params.symbol, deps);
      if (!detail) return res.status(404).json({ error: 'Asset non trovato' });
      res.json(detail);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/portfolio/getDashboard', withDb, requireAuth, async (req, res) => {
    try {
      const dashboard = await getDashboard(req.userId, deps);
      res.json(dashboard);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/portfolio/getHistory', withDb, requireAuth, async (req, res) => {
    try {
      const range = String(req.query.range || '1M').toUpperCase();
      const history = await getPortfolioHistory(req.userId, range);
      res.json({ range, history });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications/registerTelegram', withDb, requireAuth, async (req, res) => {
    try {
      const { chatId, telegram_chat_id } = req.body ?? {};
      const result = await registerTelegram(req.userId, chatId ?? telegram_chat_id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/notifications/registerWhatsApp', withDb, requireAuth, async (req, res) => {
    try {
      const { phoneNumber, whatsapp_number } = req.body ?? {};
      const result = await registerWhatsApp(req.userId, phoneNumber ?? whatsapp_number);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/notifications/registerSlack', withDb, requireAuth, async (req, res) => {
    try {
      const { webhookUrl, slack_webhook_url } = req.body ?? {};
      const result = await registerSlack(req.userId, webhookUrl ?? slack_webhook_url ?? '');
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/notifications/emailAlerts', withDb, requireAuth, async (req, res) => {
    try {
      const { enabled } = req.body ?? {};
      const result = await setEmailAlerts(req.userId, enabled);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/notifications/preferences', withDb, requireAuth, async (req, res) => {
    try {
      const prefs = await getNotificationPreferences(req.userId);
      res.json(prefs);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/notifications/preferences', withDb, requireAuth, async (req, res) => {
    try {
      const prefs = await updateNotificationPreferences(req.userId, req.body ?? {});
      res.json(prefs);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /** Canali di notifica disponibili/configurati lato server. */
  app.get('/api/notifications/config', (_req, res) => {
    res.json({
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
      whatsapp: Boolean(
        (process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim()) ||
          process.env.WHATSAPP_CLOUD_TOKEN?.trim()
      ),
      slack: true, // webhook fornito dall'utente, nessuna config server necessaria
      email: isEmailConfigured(),
      webpush: isWebPushConfigured(),
    });
  });

  /** Chiave pubblica VAPID per la subscription push lato browser (no auth). */
  app.get('/api/notifications/push/publicKey', (_req, res) => {
    const key = getVapidPublicKey();
    if (!key) {
      return res.status(503).json({ error: 'Web Push non configurato (VAPID mancante)' });
    }
    res.json({ publicKey: key });
  });

  app.post('/api/notifications/push/subscribe', withDb, requireAuth, async (req, res) => {
    try {
      if (!isWebPushConfigured()) {
        return res.status(503).json({ error: 'Web Push non configurato sul server' });
      }
      await savePushSubscription(req.userId, req.body);
      res.status(201).json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/notifications/push/unsubscribe', withDb, requireAuth, async (req, res) => {
    try {
      const endpoint = req.body?.endpoint;
      await deletePushByEndpoint(endpoint, req.userId);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /** Trigger manuale cron (Netlify scheduled o test locale). */
  app.post('/api/cron/portfolio-monitor', withDb, requireCronSecret, async (req, res) => {
    try {
      const result = await runPortfolioMonitor(deps);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error('[cron] portfolio-monitor:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/portfolio/rebalance', withDb, requireAuth, async (req, res) => {
    try {
      const dashboard = await getDashboard(req.userId, deps);
      const mode = String(req.query.mode || 'equal');
      const result = suggestRebalance(dashboard.positions, { mode });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/portfolio/tax-loss', withDb, requireAuth, async (req, res) => {
    try {
      const dashboard = await getDashboard(req.userId, deps);
      const result = findTaxLossCandidates(dashboard.positions);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/webhooks', withDb, requireAuth, async (req, res) => {
    try {
      const hooks = await listOutboundWebhooks(req.userId);
      res.json({ webhooks: hooks });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/webhooks', withDb, requireAuth, async (req, res) => {
    try {
      const { url, events } = req.body ?? {};
      const result = await registerOutboundWebhook(req.userId, url, events);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/webhooks/:id', withDb, requireAuth, async (req, res) => {
    try {
      await deleteOutboundWebhook(req.userId, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/paper/account', withDb, requireAuth, async (req, res) => {
    try {
      const account = await getPaperAccount(req.userId);
      res.json(account);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/paper/trades', withDb, requireAuth, async (req, res) => {
    try {
      const trades = await getPaperTrades(req.userId);
      res.json({ trades });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/paper/trade', withDb, requireAuth, async (req, res) => {
    try {
      const { symbol, assetType, side, quantity, price } = req.body ?? {};
      const account = await paperTrade(
        req.userId,
        { symbol, assetType, side, quantity, price },
        deps
      );
      res.json(account);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}
