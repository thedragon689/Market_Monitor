import { lazy } from 'react';

/** Registry widget dashboard (Prompt 2) — lazy loading per code-split. */
export const WIDGET_REGISTRY = {
  quote: {
    id: 'quote',
    title: 'Quotazione',
    component: lazy(() => import('../QuotePanel')),
    defaultColSpan: 4,
  },
  chart: {
    id: 'chart',
    title: 'Grafico candele',
    component: lazy(() => import('../CandlestickChart')),
    defaultColSpan: 8,
  },
  indicators: {
    id: 'indicators',
    title: 'Indicatori tecnici',
    component: lazy(() => import('../TechnicalIndicators')),
    defaultColSpan: 4,
  },
  correlations: {
    id: 'correlations',
    title: 'Correlazioni',
    component: lazy(() => import('../MarketCorrelations')),
    defaultColSpan: 4,
  },
  forecast: {
    id: 'forecast',
    title: 'Previsione',
    component: lazy(() => import('../ForecastCards')),
    defaultColSpan: 4,
  },
  alerts: {
    id: 'alerts',
    title: 'Alert intelligenti',
    component: lazy(() => import('../IntelligentAlerts')),
    defaultColSpan: 4,
  },
};

export const WIDGET_IDS = Object.keys(WIDGET_REGISTRY);
