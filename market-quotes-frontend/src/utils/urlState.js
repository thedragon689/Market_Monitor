import { VIEW_IDS } from '../data/views.js';

const VALID_VIEWS = new Set(VIEW_IDS);
const VALID_TYPES = new Set(['stock', 'national', 'crypto', 'precious', 'commodity']);

export function parseUrlState(search) {
  const q = new URLSearchParams(search);
  const out = {};
  const view = q.get('view');
  const type = q.get('type');
  const symbol = q.get('symbol');
  if (view && VALID_VIEWS.has(view)) out.view = view;
  if (type && VALID_TYPES.has(type)) out.type = type;
  if (symbol) out.symbol = symbol.trim().toUpperCase();
  const w = Number(q.get('window'));
  const h = Number(q.get('horizon'));
  if (w >= 2 && w <= 60) out.windowN = w;
  if (h >= 1 && h <= 30) out.horizonDays = h;
  const method = q.get('method');
  if (method && ['linear', 'forest', 'both'].includes(method)) {
    out.forecastMethod = method;
  }
  return out;
}

export function buildUrlState(state) {
  const q = new URLSearchParams();
  if (state.view && state.view !== 'explore') q.set('view', state.view);
  if (state.type && state.type !== 'stock') q.set('type', state.type);
  if (state.symbol && !(state.type === 'stock' && state.symbol === 'AAPL')) {
    q.set('symbol', state.symbol);
  }
  if (state.windowN && state.windowN !== 5) q.set('window', String(state.windowN));
  if (state.horizonDays && state.horizonDays !== 5) {
    q.set('horizon', String(state.horizonDays));
  }
  if (state.forecastMethod && state.forecastMethod !== 'both') {
    q.set('method', state.forecastMethod);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function syncUrlState(state) {
  const next = buildUrlState(state);
  const path = window.location.pathname + next;
  if (window.location.pathname + window.location.search !== path) {
    window.history.replaceState(null, '', path);
  }
}
