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
            <span className="intel-alerts__type">{a.type}</span>
            {a.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
