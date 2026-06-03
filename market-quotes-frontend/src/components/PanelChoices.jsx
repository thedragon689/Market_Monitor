export default function PanelChoices({
  label,
  hint,
  options,
  selected,
  onChange,
  multiple = true,
  className = '',
}) {
  const toggle = (id) => {
    if (!multiple) {
      onChange([id]);
      return;
    }
    if (selected.includes(id)) {
      if (selected.length === 1) return;
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className={`panel-choices ${className}`.trim()} role="group" aria-label={label}>
      <div className="panel-choices__head">
        <span className="panel-choices__label">{label}</span>
        {hint && <span className="panel-choices__hint">{hint}</span>}
      </div>
      <div className="panel-choices__chips">
        {options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`panel-choices__chip ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => toggle(opt.id)}
            >
              <span className="panel-choices__chip-label">{opt.label}</span>
              {opt.hint && (
                <span className="panel-choices__chip-hint">{opt.hint}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
