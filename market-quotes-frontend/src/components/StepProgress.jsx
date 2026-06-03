const STEPS = [
  { id: 'explore', label: 'Scegli' },
  { id: 'analysis', label: 'Analizza' },
  { id: 'advice', label: 'Consigli' },
  { id: 'forecast', label: 'Prevedi' },
];

export default function StepProgress({ view, onViewChange }) {
  const idx = STEPS.findIndex((s) => s.id === view);

  return (
    <nav className="step-progress" aria-label="Avanzamento passi">
      <ol className="step-progress__list">
        {STEPS.map((step, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li
              key={step.id}
              className={`step-progress__item ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}
            >
              <button
                type="button"
                className="step-progress__btn"
                onClick={() => onViewChange(step.id)}
                aria-current={active ? 'step' : undefined}
              >
                <span className="step-progress__dot" aria-hidden>
                  {done ? '✓' : i + 1}
                </span>
                <span className="step-progress__label">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span className="step-progress__line" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
