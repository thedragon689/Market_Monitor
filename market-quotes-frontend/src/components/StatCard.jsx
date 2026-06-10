export default function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
  loading,
  refreshing = false,
}) {
  return (
    <div
      className={`stat-card stat-card--${tone} ${loading ? 'stat-card--loading' : ''} ${refreshing ? 'stat-card--refreshing' : ''}`}
    >
      <span className="stat-card__label">{label}</span>
      {loading ? (
        <span className="stat-card__value skeleton skeleton--line" />
      ) : (
        <>
          <strong className="stat-card__value">{value ?? '—'}</strong>
          {sub && <span className="stat-card__sub">{sub}</span>}
        </>
      )}
    </div>
  );
}
