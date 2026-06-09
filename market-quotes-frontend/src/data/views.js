/** Unica fonte per tab shell, titoli pagina e URL state. */
export const APP_VIEWS = [
  {
    id: 'explore',
    step: '1',
    label: 'Scegli',
    hint: 'Categoria e titolo',
    title: 'Scegli cosa analizzare',
    lead: 'Seleziona una categoria di mercato, poi un titolo o materia prima dalla griglia o dalla selezione rapida.',
  },
  {
    id: 'analysis',
    step: '2',
    label: 'Analizza',
    hint: 'Prezzo e segnali',
    title: 'Leggi il mercato adesso',
    lead: 'Quotazione live, indicatori, correlazioni e contesto geopolitico per qualsiasi categoria di mercato.',
  },
  {
    id: 'advice',
    step: '3',
    label: 'Consigli',
    hint: 'Acquisto / vendita',
    title: 'Consigli acquisto / vendita',
    lead: 'Sintesi automatica da RSI, MACD, regime, rischio, geo e (opzionale) previsione — orientamento acquisto, vendita o mantieni.',
  },
  {
    id: 'forecast',
    step: '4',
    label: 'Prevedi',
    hint: 'Scenari futuri',
    title: 'Calcola la previsione',
    lead: 'Scegli tra metodi classici (SMA, regressione) o motori ML (ARIMA, LSTM), imposta finestra e orizzonte, poi calcola.',
  },
];

export const INFO_VIEW = {
  id: 'info',
  label: 'Info',
  title: 'Info & note legali',
  lead: 'Disclaimer, fonti dati e trasparenza sui modelli previsionali.',
};

export const VIEW_IDS = [...APP_VIEWS.map((v) => v.id), INFO_VIEW.id];

export function getViewIndex(viewId) {
  if (viewId === INFO_VIEW.id) return -1;
  return APP_VIEWS.findIndex((v) => v.id === viewId);
}

export function getViewIntro(viewId) {
  if (viewId === INFO_VIEW.id) {
    return { step: null, title: INFO_VIEW.title, lead: INFO_VIEW.lead };
  }
  const v = APP_VIEWS.find((x) => x.id === viewId);
  if (!v) return null;
  return { step: Number(v.step), title: v.title, lead: v.lead };
}

export function getViewMeta(viewId) {
  if (viewId === INFO_VIEW.id) return INFO_VIEW;
  return APP_VIEWS.find((x) => x.id === viewId) ?? APP_VIEWS[0];
}
