/** Tooltip accessibile su hover/focus. Il contenuto sta in `label`. */
export default function Tooltip({ label, children, className = '' }) {
  return (
    <span className={`ui-tooltip ${className}`.trim()}>
      {children}
      <span role="tooltip" className="ui-tooltip__bubble">
        {label}
      </span>
    </span>
  );
}
