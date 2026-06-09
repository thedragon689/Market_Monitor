/** Opzioni pannello per ogni passo del flusso UX. */

export const EXPLORE_PANEL_OPTIONS = [
  { id: 'quick', label: 'Selezione rapida', hint: 'Chip asset' },
  { id: 'catalog', label: 'Catalogo', hint: 'Griglia prezzi' },
  { id: 'compare', label: 'Confronto', hint: 'Tabella categoria' },
  { id: 'legend', label: 'Legenda', hint: 'Guida termini' },
];

export const CATALOG_SCOPE_OPTIONS = [
  { id: 'category', label: 'Solo categoria attiva' },
  { id: 'all', label: 'Tutte le categorie' },
];

export const ANALYSIS_PANEL_OPTIONS = [
  { id: 'indicators', label: 'Indicatori tecnici', hint: 'SMA · RSI · MACD' },
  { id: 'correlations', label: 'Correlazioni', hint: 'Benchmark ρ' },
  { id: 'geo', label: 'Contesto globale', hint: 'Geo · risk · news' },
  { id: 'compare', label: 'Tabella confronto', hint: 'Peer categoria' },
  { id: 'legend', label: 'Legenda', hint: 'Guida termini' },
];

export const FORECAST_PANEL_OPTIONS = [
  { id: 'params', label: 'Parametri calcolo', hint: 'N · giorni · metodo' },
  { id: 'advanced', label: 'ML avanzato', hint: 'Polinomio · RF' },
  { id: 'geo', label: 'Impatto geopolitico', hint: 'Dopo il calcolo' },
  { id: 'legend', label: 'Legenda', hint: 'Metodi previsione' },
];

export function defaultPanelSet(options, ids) {
  const allowed = new Set(options.map((o) => o.id));
  return ids.filter((id) => allowed.has(id));
}
