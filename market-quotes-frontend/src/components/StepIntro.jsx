const STEPS = {
  explore: {
    step: 1,
    title: 'Scegli cosa analizzare',
    lead: 'Seleziona una categoria di mercato, poi un titolo o materia prima dalla griglia o dalla selezione rapida.',
  },
  analysis: {
    step: 2,
    title: 'Leggi il mercato adesso',
    lead: 'Quotazione live, indicatori, correlazioni e contesto geopolitico per qualsiasi categoria di mercato.',
  },
  advice: {
    step: 3,
    title: 'Consigli acquisto / vendita',
    lead: 'Sintesi automatica da RSI, MACD, regime, rischio, geo e (opzionale) previsione — orientamento acquisto, vendita o mantieni.',
  },
  forecast: {
    step: 4,
    title: 'Calcola la previsione',
    lead: 'Imposta finestra e orizzonte temporale, poi genera scenari con media mobile e regressione.',
  },
};

import StepProgress from './StepProgress';

export default function StepIntro({ view, onViewChange }) {
  const info = STEPS[view];
  if (!info) return null;

  return (
    <div className="step-intro-block">
      {onViewChange && <StepProgress view={view} onViewChange={onViewChange} />}
      <div className="step-intro">
        <span className="step-intro__badge">Passo {info.step}</span>
        <h2 className="step-intro__title">{info.title}</h2>
        <p className="step-intro__lead">{info.lead}</p>
      </div>
    </div>
  );
}
