export default function IntelligentAlerts({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <section className="intel-alerts app-card" aria-label="Avvisi intelligenti">
      <h3 className="intel-alerts__title">Avvisi</h3>
      <ul className="intel-alerts__list">
        {alerts.map((a, i) => (
          <li
            key={`${a.type}-${i}`}
            className={`intel-alerts__item intel-alerts__item--${a.level || 'info'}`}
          >
            <div className="intel-alerts__head">
              <span className="intel-alerts__type">{a.type}</span>
              <span className="intel-alerts__message">{a.message}</span>
            </div>
            {a.detail && <p className="intel-alerts__detail">{a.detail}</p>}
            {a.suggestion && (
              <p className="intel-alerts__suggestion">
                <span aria-hidden="true">💡</span> {a.suggestion}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
