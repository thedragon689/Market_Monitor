import { API_BASE } from '../config/api';
import { apiFetch } from './apiFetch';

const TOKEN_KEY = 'market-monitor-portfolio-token';
const SESSION_FLAG = 'mm:portfolio-session-active';

let refreshInFlight = null;
let tokenProvider = () => getPortfolioToken();
let usingAuth0Tokens = false;

const AUTH_CREDENTIALS = { credentials: 'include' };

/** Permette ad Auth0 (o altri) di fornire il bearer token alle API portfolio. */
export function setPortfolioTokenProvider(fn) {
  if (!fn) {
    tokenProvider = () => getPortfolioToken();
    usingAuth0Tokens = false;
    markPortfolioSessionActive(false);
  } else {
    tokenProvider = fn;
    usingAuth0Tokens = true;
    markPortfolioSessionActive(true);
  }
}

async function resolveAccessToken() {
  const value = tokenProvider();
  if (value && typeof value.then === 'function') return value;
  return value;
}

export { resolveAccessToken };

export function isUsingAuth0Tokens() {
  return usingAuth0Tokens;
}

export async function hasPortfolioSession() {
  try {
    return Boolean(await resolveAccessToken());
  } catch {
    return false;
  }
}

export function getPortfolioToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** @deprecated refresh token è in cookie httpOnly */
export function getRefreshToken() {
  return null;
}

export function setPortfolioTokens({ accessToken }) {
  try {
    const token = accessToken || null;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(SESSION_FLAG, '1');
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SESSION_FLAG);
    }
  } catch {
    /* ignore */
  }
}

export function markPortfolioSessionActive(active = true) {
  try {
    if (active) localStorage.setItem(SESSION_FLAG, '1');
    else localStorage.removeItem(SESSION_FLAG);
  } catch {
    /* ignore */
  }
}

export function hasPortfolioSessionSync() {
  try {
    return localStorage.getItem(SESSION_FLAG) === '1' || Boolean(localStorage.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
}

export function setPortfolioToken(token) {
  setPortfolioTokens({ accessToken: token });
}

export async function refreshPortfolioAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = apiFetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      ...AUTH_CREDENTIALS,
    }).finally(() => {
      refreshInFlight = null;
    });
  }
  const { data } = await refreshInFlight;
  setPortfolioTokens({
    accessToken: data.accessToken || data.token,
  });
  return data;
}

export async function portfolioFetch(path, options = {}, allowRefresh = true) {
  const token = await resolveAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  try {
    const { data } = await apiFetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      ...AUTH_CREDENTIALS,
    });
    return data;
  } catch (err) {
    if (allowRefresh && err?.status === 401 && !usingAuth0Tokens) {
      await refreshPortfolioAccessToken();
      return portfolioFetch(path, options, false);
    }
    throw err;
  }
}

export async function registerPortfolio(email, password, options = {}) {
  const { phoneNumber, notificationPrefs } = options;
  const data = await portfolioFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, phoneNumber, notificationPrefs }),
  });
  setPortfolioTokens({ accessToken: data.token || data.accessToken });
  return data;
}

export async function loginPortfolio(email, password, totpCode) {
  const data = await portfolioFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, totpCode }),
  });
  setPortfolioTokens({ accessToken: data.token || data.accessToken });
  return data;
}

export async function fetchCurrentUser() {
  return portfolioFetch('/api/auth/me');
}

export async function logoutPortfolio() {
  const token = await resolveAccessToken();
  if (token) {
    try {
      await portfolioFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
  }
  setPortfolioTokens({});
}

export async function verifyEmailToken(token) {
  const { data, ok } = await apiFetch(
    `${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    { optional: true, ...AUTH_CREDENTIALS }
  );
  if (!ok) throw new Error(data?.error || 'Verifica fallita');
  return data;
}

export async function resendEmailVerification() {
  return portfolioFetch('/api/auth/resend-verification', { method: 'POST' });
}

export async function fetchAuthConfig() {
  const { data } = await apiFetch(`${API_BASE}/api/auth/config`, {
    method: 'GET',
    optional: true,
  });
  return data;
}

export async function loginOAuth(provider, payload = {}) {
  const body = typeof payload === 'string' ? { token: payload } : payload;
  const data = await portfolioFetch(`/api/auth/oauth/${provider}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  setPortfolioTokens({ accessToken: data.token || data.accessToken });
  return data;
}

export async function setupTotp() {
  return portfolioFetch('/api/auth/totp/setup', { method: 'POST' });
}

export async function enableTotp(code) {
  return portfolioFetch('/api/auth/totp/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disableTotp({ password, code } = {}) {
  return portfolioFetch('/api/auth/totp/disable', {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  });
}

export async function fetchDashboardLayout() {
  return portfolioFetch('/api/user/dashboard-layout');
}

export async function saveDashboardLayoutRemote(layout) {
  return portfolioFetch('/api/user/dashboard-layout', {
    method: 'PUT',
    body: JSON.stringify({ layout }),
  });
}

export async function fetchPortfolioDashboard() {
  return portfolioFetch('/api/portfolio/getDashboard');
}

export async function fetchPortfolioAsset(symbol) {
  return portfolioFetch(`/api/portfolio/getAsset/${encodeURIComponent(symbol)}`);
}

export async function addPortfolioAsset(payload) {
  return portfolioFetch('/api/portfolio/addAsset', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function addPortfolioTransaction(payload) {
  return portfolioFetch('/api/portfolio/addTransaction', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePortfolioAlerts(symbol, payload) {
  return portfolioFetch(`/api/portfolio/updateAlerts/${encodeURIComponent(symbol)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchPortfolioHistory(range = '1M') {
  return portfolioFetch(`/api/portfolio/getHistory?range=${encodeURIComponent(range)}`);
}

export async function registerPortfolioTelegram(chatId) {
  return portfolioFetch('/api/notifications/registerTelegram', {
    method: 'POST',
    body: JSON.stringify({ chatId }),
  });
}

export async function registerPortfolioWhatsApp(phoneNumber) {
  return portfolioFetch('/api/notifications/registerWhatsApp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function registerPortfolioSlack(webhookUrl) {
  return portfolioFetch('/api/notifications/registerSlack', {
    method: 'POST',
    body: JSON.stringify({ webhookUrl }),
  });
}

export async function setPortfolioEmailAlerts(enabled) {
  return portfolioFetch('/api/notifications/emailAlerts', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export async function getNotificationsConfig() {
  return portfolioFetch('/api/notifications/config');
}

export async function getNotificationPreferences() {
  return portfolioFetch('/api/notifications/preferences');
}

export async function updateNotificationPreferences(prefs) {
  return portfolioFetch('/api/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(prefs),
  });
}
