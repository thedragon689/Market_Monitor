import { useEffect, useId, useRef, useState } from 'react';
import { FORECAST_DISCLAIMERS } from '../data/forecastDisclaimer';

export default function ForecastDisclaimerInfo({ className = '', label }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className={`forecast-disclaimer-info ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="forecast-disclaimer-info__trigger"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label="Informazioni legali e avvertenze sulle previsioni"
        title="Informazioni legali e avvertenze"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="forecast-disclaimer-info__icon" aria-hidden>
          ℹ️
        </span>
        {label && <span className="forecast-disclaimer-info__label">{label}</span>}
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-labelledby={`${popoverId}-title`}
          className="forecast-disclaimer-info__popover"
        >
          <header className="forecast-disclaimer-info__popover-head">
            <h4 id={`${popoverId}-title`} className="forecast-disclaimer-info__popover-title">
              Avvertenze
            </h4>
            <button
              type="button"
              className="forecast-disclaimer-info__close"
              aria-label="Chiudi avvertenze"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="forecast-disclaimer-info__body">
            {FORECAST_DISCLAIMERS.map((block) => (
              <section key={block.id} className="forecast-disclaimer-info__block">
                <h5 className="forecast-disclaimer-info__block-title">
                  {block.icon && (
                    <span className="forecast-disclaimer-info__block-icon" aria-hidden>
                      {block.icon}
                    </span>
                  )}
                  {block.title}
                </h5>
                {block.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="forecast-disclaimer-info__text">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
