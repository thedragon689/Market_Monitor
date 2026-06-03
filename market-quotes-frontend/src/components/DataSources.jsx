const PROVIDER_LABELS = {
  'yahoo-finance': 'Yahoo',
  stooq: 'Stooq',
  alphavantage: 'Alpha Vantage',
  fcsapi: 'FCS API',
  'binance+kraken': 'Binance · Kraken',
  binance: 'Binance',
  kraken: 'Kraken',
};

export default function DataSources({
  type,
  provider,
  sources,
  alternates,
  categoryConfig,
}) {
  const list = sources?.length
    ? sources
    : (categoryConfig?.providers ?? []).map((p) => ({
        provider: p.id,
        ok: p.id === provider,
        status: p.id === provider ? 'ok' : 'idle',
      }));

  if (!list.length && !provider) return null;

  return (
    <section className="data-sources app-card" aria-label="Fonti dati">
      <h3 className="data-sources__title">Fonti dati · {categoryConfig?.label || type}</h3>
      <ul className="data-sources__list">
        {list.map((s) => (
          <li
            key={s.provider}
            className={`data-sources__item ${s.ok ? 'is-ok' : 'is-fail'} ${s.provider === provider ? 'is-primary' : ''}`}
          >
            <span className="data-sources__name">
              {PROVIDER_LABELS[s.provider] || s.provider}
              {s.provider === provider && (
                <span className="data-sources__badge">primaria</span>
              )}
            </span>
            <span className="data-sources__status">
              {s.ok
                ? s.points
                  ? `${s.points} punti`
                  : 'OK'
                : s.error?.slice(0, 48) || 'non disp.'}
            </span>
          </li>
        ))}
      </ul>
      {alternates?.length > 0 && (
        <p className="data-sources__alt">
          Confronto:{' '}
          {alternates
            .map(
              (a) =>
                `${PROVIDER_LABELS[a.provider] || a.provider} ${a.price != null ? Number(a.price).toFixed(2) : '—'}`
            )
            .join(' · ')}
        </p>
      )}
    </section>
  );
}
