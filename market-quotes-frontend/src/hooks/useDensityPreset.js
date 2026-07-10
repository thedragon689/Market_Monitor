const STORAGE_KEY = 'mm:density';
export const DENSITY_PRESETS = {
  trader: { id: 'trader', label: 'Trader attivo', density: 'compact' },
  investor: { id: 'investor', label: 'Investitore', density: 'comfortable' },
};

export function loadDensity() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'compact' || v === 'comfortable' ? v : 'comfortable';
  } catch {
    return 'comfortable';
  }
}

export function saveDensity(density) {
  try {
    localStorage.setItem(STORAGE_KEY, density);
  } catch {
    /* ignore */
  }
}

export function applyDensity(density) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.density = density;
}

/** Parsing comandi vocali strutturati → intent navigazione. */
export function parseVoiceCommand(transcript) {
  const t = String(transcript || '').toLowerCase().trim();
  if (!t) return null;
  if (/prevision|forecast/.test(t)) return { action: 'navigate', view: 'forecast' };
  if (/portfolio|portafoglio/.test(t)) return { action: 'navigate', view: 'portfolio' };
  if (/watchlist|lista/.test(t)) return { action: 'navigate', view: 'watchlist' };
  if (/dashboard/.test(t)) return { action: 'navigate', view: 'dashboard' };
  if (/analizz|analysis|grafico/.test(t)) return { action: 'navigate', view: 'analysis' };
  if (/consigli|advice/.test(t)) return { action: 'navigate', view: 'advice' };
  const sym = t.match(/\b([a-z]{2,5})\b/i);
  if (sym && /apri|mostra|vai/.test(t)) return { action: 'symbol', symbol: sym[1].toUpperCase() };
  return { action: 'unknown', raw: t };
}
