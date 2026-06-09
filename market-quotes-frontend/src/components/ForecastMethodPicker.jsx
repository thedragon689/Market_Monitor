import {
  CLASSIC_METHOD_IDS,
  DESKTOP_METHOD_SECTIONS,
  FORECAST_METHOD_GROUPS,
  FORECAST_METHOD_META,
  defaultMethodForGroup,
  getMethodMeta,
  historyWarning,
  methodToGroup,
} from '../data/forecastMethods';

function historyReady(minHistory, historyLength) {
  return historyLength == null || historyLength <= 0 || historyLength >= minHistory;
}

function MethodLinePreview({ chartKey }) {
  return (
    <span
      className={`forecast-method-option__preview forecast-method-option__preview--${chartKey}`}
      aria-hidden
    />
  );
}

function MethodOption({ id, value, onChange, historyLength, wide = false }) {
  const meta = FORECAST_METHOD_META[id];
  const active = value === id;
  const ready = historyReady(meta.minHistory, historyLength);

  return (
    <button
      type="button"
      className={`forecast-method-option forecast-method-option--${meta.chartKey || id} ${active ? 'is-active' : ''} ${ready ? '' : 'is-disabled'} ${wide ? 'forecast-method-option--wide' : ''}`}
      aria-pressed={active}
      onClick={() => onChange(id)}
    >
      <span className="forecast-method-option__top">
        <MethodLinePreview chartKey={meta.chartKey || id} />
        {meta.badge && <span className="forecast-method-option__badge">{meta.badge}</span>}
      </span>
      <span className="forecast-method-option__title">{meta.label}</span>
      <span className="forecast-method-option__hint">{meta.hint}</span>
      {meta.detail && (
        <span className="forecast-method-option__detail">{meta.detail}</span>
      )}
      <span className="forecast-method-option__foot">
        <span className="forecast-method-option__output">{meta.output}</span>
        <span className="forecast-method-option__req">
          {ready ? `${meta.minHistory}+ gg` : `≥ ${meta.minHistory} gg`}
        </span>
      </span>
    </button>
  );
}

function HistoryBadge({ historyLength }) {
  if (!historyLength) {
    return (
      <span className="forecast-method-picker__history forecast-method-picker__history--unknown">
        Storico non caricato
      </span>
    );
  }
  const tone = historyLength >= 30 ? 'ok' : historyLength >= 18 ? 'mid' : 'low';
  return (
    <span className={`forecast-method-picker__history forecast-method-picker__history--${tone}`}>
      Storico: <strong>{historyLength}</strong> giorni
    </span>
  );
}

function DesktopPicker({ value, onChange, historyLength, warning, meta }) {
  return (
    <div className="forecast-method-picker forecast-method-picker--desktop">
      <div className="forecast-method-picker__desktop-head">
        <div>
          <span className="forecast-method-picker__label">Tipo di valore da calcolare</span>
          <p className="forecast-method-picker__desktop-lead">
            Scegli cosa stimare sul prezzo futuro. Ogni opzione produce un risultato diverso nel
            grafico e nelle card sotto.
          </p>
        </div>
        <div className="forecast-method-picker__desktop-meta">
          <HistoryBadge historyLength={historyLength} />
          <span className="forecast-method-picker__active">
            Selezionato: <strong>{meta.label}</strong>
          </span>
        </div>
      </div>

      <div className="forecast-method-picker__desktop-sections">
        {DESKTOP_METHOD_SECTIONS.map((section) => (
          <section
            key={section.id}
            className={`forecast-method-picker__section forecast-method-picker__section--${section.id} ${section.wide ? 'forecast-method-picker__section--wide' : ''}`}
            aria-labelledby={`forecast-section-${section.id}`}
          >
            <header className="forecast-method-picker__section-head">
              <h4 id={`forecast-section-${section.id}`} className="forecast-method-picker__section-title">
                {section.title}
              </h4>
              <p className="forecast-method-picker__section-sub">{section.subtitle}</p>
            </header>
            <div
              className={`forecast-method-picker__option-grid ${section.wide ? 'forecast-method-picker__option-grid--wide' : ''}`}
              role="group"
              aria-label={section.title}
            >
              {section.ids.map((id) => (
                <MethodOption
                  key={id}
                  id={id}
                  value={value}
                  onChange={onChange}
                  historyLength={historyLength}
                  wide={section.wide}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {warning && (
        <p className="forecast-method-picker__notice" role="status">
          {warning} Prova ad aggiornare le quotazioni o scegli un metodo classico.
        </p>
      )}
    </div>
  );
}

function GroupTabs({ activeGroup, onGroupChange }) {
  return (
    <div className="forecast-method-picker__groups" role="tablist" aria-label="Tipo di previsione">
      {FORECAST_METHOD_GROUPS.map((g) => (
        <button
          key={g.id}
          type="button"
          role="tab"
          aria-selected={activeGroup === g.id}
          className={`forecast-method-picker__group ${activeGroup === g.id ? 'is-active' : ''}`}
          onClick={() => onGroupChange(g.id)}
        >
          <span className="forecast-method-picker__group-label">{g.label}</span>
          <span className="forecast-method-picker__group-hint">{g.hint}</span>
        </button>
      ))}
    </div>
  );
}

function ClassicMethods({ value, onChange }) {
  return (
    <div className="forecast-method-picker__classic" role="group" aria-label="Metodi classici">
      {CLASSIC_METHOD_IDS.map((id) => {
        const m = FORECAST_METHOD_META[id];
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            className={`forecast-method-picker__chip ${active ? 'is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(id)}
          >
            <span className="forecast-method-picker__chip-label">{m.label}</span>
            <span className="forecast-method-picker__chip-hint">{m.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

function MlEngineCard({ id, value, onChange, historyLength }) {
  const m = FORECAST_METHOD_META[id];
  const active = value === id;
  const ready = historyReady(m.minHistory, historyLength);

  return (
    <button
      type="button"
      className={`forecast-method-card forecast-method-card--${m.engine} ${active ? 'is-active' : ''} ${ready ? '' : 'is-disabled'}`}
      aria-pressed={active}
      onClick={() => onChange(id)}
    >
      <span className="forecast-method-card__tag">{m.tag}</span>
      <span className="forecast-method-card__title">{m.label}</span>
      <span className="forecast-method-card__hint">{m.hint}</span>
      <span className="forecast-method-card__detail">{m.detail}</span>
      <span className="forecast-method-card__req">
        {ready ? `✓ ${m.minHistory}+ giorni` : `Serve storico ≥ ${m.minHistory} gg`}
      </span>
    </button>
  );
}

function MlMethods({ value, onChange, historyLength }) {
  const comboActive = value === 'ml';

  return (
    <div className="forecast-method-picker__ml">
      <p className="forecast-method-picker__lead">
        Scegli un motore o confrontali insieme. I modelli ML analizzano più giorni di storico rispetto
        a SMA e regressione.
      </p>
      <div className="forecast-method-picker__ml-grid" role="group" aria-label="Motori machine learning">
        <MlEngineCard id="arima" value={value} onChange={onChange} historyLength={historyLength} />
        <MlEngineCard id="lstm" value={value} onChange={onChange} historyLength={historyLength} />
      </div>
      <button
        type="button"
        className={`forecast-method-picker__combo ${comboActive ? 'is-active' : ''}`}
        aria-pressed={comboActive}
        onClick={() => onChange('ml')}
      >
        <span className="forecast-method-picker__combo-label">ARIMA + LSTM insieme</span>
        <span className="forecast-method-picker__combo-hint">
          Due scenari sul grafico — viola e rosa
        </span>
      </button>
    </div>
  );
}

function AllMethodsInfo() {
  const m = FORECAST_METHOD_META.all;
  return (
    <div className="forecast-method-picker__all" role="status">
      <p className="forecast-method-picker__all-title">{m.label}</p>
      <p className="forecast-method-picker__all-hint">{m.hint}</p>
      <ul className="forecast-method-picker__all-list">
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--sma" />
          SMA — media mobile
        </li>
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--linear" />
          Regressione lineare
        </li>
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--log" />
          Log-return
        </li>
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--arima" />
          ARIMA — serie temporale
        </li>
        <li>
          <span className="forecast-method-picker__dot forecast-method-picker__dot--lstm" />
          LSTM — rete neurale
        </li>
      </ul>
      <p className="forecast-method-picker__all-req">Consigliato con almeno 30 giorni di quotazioni.</p>
    </div>
  );
}

function MobilePicker({ value, onChange, historyLength, warning, meta }) {
  const activeGroup = methodToGroup(value);

  const handleGroupChange = (groupId) => {
    if (groupId === activeGroup && groupId !== 'all') return;
    onChange(defaultMethodForGroup(groupId));
  };

  return (
    <div className="forecast-method-picker forecast-method-picker--mobile">
      <div className="forecast-method-picker__head">
        <span className="forecast-method-picker__label">Come calcolare la previsione</span>
        {value && (
          <span className="forecast-method-picker__active">
            Attivo: <strong>{meta.label}</strong>
          </span>
        )}
      </div>

      <GroupTabs activeGroup={activeGroup} onGroupChange={handleGroupChange} />

      <div className="forecast-method-picker__body" role="tabpanel">
        {activeGroup === 'classic' && <ClassicMethods value={value} onChange={onChange} />}
        {activeGroup === 'ml' && (
          <MlMethods value={value} onChange={onChange} historyLength={historyLength} />
        )}
        {activeGroup === 'all' && <AllMethodsInfo />}
      </div>

      {warning && (
        <p className="forecast-method-picker__notice" role="status">
          {warning} Prova ad aggiornare le quotazioni o scegli un metodo classico.
        </p>
      )}
    </div>
  );
}

export default function ForecastMethodPicker({
  value,
  onChange,
  historyLength,
  layout = 'mobile',
}) {
  const warning = historyWarning(value, historyLength);
  const meta = getMethodMeta(value);

  if (layout === 'desktop') {
    return (
      <DesktopPicker
        value={value}
        onChange={onChange}
        historyLength={historyLength}
        warning={warning}
        meta={meta}
      />
    );
  }

  return (
    <MobilePicker
      value={value}
      onChange={onChange}
      historyLength={historyLength}
      warning={warning}
      meta={meta}
    />
  );
}
