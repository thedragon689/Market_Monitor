import { useState } from 'react';

const PILLAR_ICONS = {
  technical: '📈',
  context: '🌍',
  forecast: '🔮',
};

function VerdictIcon({ action }) {
  const kind =
    action === 'buy' || action === 'accumulate'
      ? 'buy'
      : action === 'sell' || action === 'reduce'
        ? 'sell'
        : 'hold';

  const svgProps = {
    viewBox: '0 0 24 24',
    width: 28,
    height: 28,
    fill: 'currentColor',
    'aria-hidden': true,
  };

  let glyph;
  if (kind === 'buy') {
    glyph = (
      <svg {...svgProps}>
        <path d="M12 5.5 19.5 20H4.5L12 5.5z" />
      </svg>
    );
  } else if (kind === 'sell') {
    glyph = (
      <svg {...svgProps}>
        <path d="M12 18.5 4.5 4h15L12 18.5z" />
      </svg>
    );
  } else {
    glyph = (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M9 12h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <span
      className={`trade-advice__verdict-icon trade-advice__verdict-icon--${kind}${action === 'accumulate' || action === 'reduce' ? ' trade-advice__verdict-icon--soft' : ''}`}
      aria-hidden
    >
      {glyph}
    </span>
  );
}

function formatPrice(value, currency) {
  if (value == null || !Number.isFinite(value)) return '—';
  const n = Number(value);
  const cur = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '';
  return `${cur}${n.toLocaleString('it-IT', { maximumFractionDigits: n >= 100 ? 2 : 4 })}`;
}

function Gauge({ position, tone }) {
  const pct = ((position + 100) / 200) * 100;
  return (
    <div className="advice-gauge" aria-hidden>
      <div className="advice-gauge__track">
        <span className="advice-gauge__zone advice-gauge__zone--sell">Vendi</span>
        <span className="advice-gauge__zone advice-gauge__zone--hold">Attendi</span>
        <span className="advice-gauge__zone advice-gauge__zone--buy">Compra</span>
        <span
          className={`advice-gauge__needle advice-gauge__needle--${tone}`}
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TradeAdvice({
  advice,
  loading,
  hasForecast,
  onEnableForecast,
  loadingForecast,
  quote,
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (loading && !advice) {
    return (
      <div className="trade-advice trade-advice--loading">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--price" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line" />
      </div>
    );
  }

  if (!advice) {
    return (
      <p className="trade-advice__empty">
        Impossibile generare il consiglio. Verifica i dati di mercato e riprova.
      </p>
    );
  }

  const confPct = Math.round((advice.confidence ?? 0) * 100);
  const headline = advice.simple?.headline ?? advice.actionLabel;
  const gaugePosition = advice.simple?.gaugePosition ?? 0;
  const snapshot = advice.dataSnapshot ?? {};
  const displayPrice = snapshot.price ?? quote?.price;
  const displayChg = snapshot.changePercent ?? quote?.changePercent;
  const chgTone =
    displayChg == null ? 'neutral' : displayChg > 0 ? 'up' : displayChg < 0 ? 'down' : 'neutral';

  return (
    <div className="trade-advice">
      <article className={`trade-advice__verdict trade-advice__verdict--${advice.tone}`}>
        <div className="trade-advice__verdict-top">
          <VerdictIcon action={advice.action} />
          <div>
            <p className="trade-advice__eyebrow">Sintesi sui dati importati</p>
            <h2 className="trade-advice__action">{headline}</h2>
            <p className="trade-advice__summary">{advice.summary}</p>
          </div>
        </div>

        <Gauge position={gaugePosition} tone={advice.tone} />
        <p className="trade-advice__gauge-caption">
          {advice.simple?.gaugeLabel ?? 'Bilancio segnali'}
          <span className="trade-advice__gauge-score">
            {advice.score > 0 ? '+' : ''}
            {advice.score}
          </span>
        </p>

        <dl className="trade-advice__snapshot">
          <div>
            <dt>Prezzo</dt>
            <dd>{formatPrice(displayPrice, snapshot.currency ?? quote?.currency)}</dd>
          </div>
          <div>
            <dt>Variazione</dt>
            <dd className={`trade-advice__chg trade-advice__chg--${chgTone}`}>
              {displayChg != null
                ? `${displayChg >= 0 ? '+' : ''}${Number(displayChg).toFixed(2)}%`
                : '—'}
            </dd>
          </div>
          <div>
            <dt>Dati</dt>
            <dd>{snapshot.sourcesLabel ?? snapshot.provider ?? '—'}</dd>
          </div>
          <div>
            <dt>Affidabilità</dt>
            <dd>
              <strong>{confPct}%</strong>
            </dd>
          </div>
        </dl>
      </article>

      <div className="trade-advice__strength" aria-label="Forza segnali">
        <span className="trade-advice__strength-item trade-advice__strength-item--bull">
          <span className="trade-advice__strength-label">Acquisto</span>
          <strong>{advice.signalStrength?.bull ?? advice.signalCounts.bull}</strong>
        </span>
        <span className="trade-advice__strength-item trade-advice__strength-item--hold">
          <span className="trade-advice__strength-label">Neutri</span>
          <strong>{advice.signalStrength?.neutral ?? advice.signalCounts.neutral}</strong>
        </span>
        <span className="trade-advice__strength-item trade-advice__strength-item--bear">
          <span className="trade-advice__strength-label">Vendita</span>
          <strong>{advice.signalStrength?.bear ?? advice.signalCounts.bear}</strong>
        </span>
      </div>

      {advice.pillars?.length > 0 && (
        <section className="trade-advice__pillars" aria-label="Valutazione per area">
          <h3 className="trade-advice__section-title">Cosa pesa di più</h3>
          <div className="trade-advice__pillar-grid">
            {advice.pillars.map((p) => (
              <div
                key={p.id}
                className={`trade-advice__pillar trade-advice__pillar--${p.direction}`}
              >
                <span className="trade-advice__pillar-icon" aria-hidden>
                  {PILLAR_ICONS[p.id] || '•'}
                </span>
                <span className="trade-advice__pillar-label">{p.label}</span>
                <div className="trade-advice__pillar-bar" aria-hidden>
                  <span
                    className="trade-advice__pillar-fill"
                    style={{ width: `${p.fillPct}%` }}
                  />
                </div>
                <p className="trade-advice__pillar-summary">{p.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {advice.topReasons?.length > 0 && (
        <section className="app-card trade-advice__reasons">
          <h3 className="trade-advice__section-title">Perché questo consiglio</h3>
          <ul className="trade-advice__reason-list">
            {advice.topReasons.map((r, i) => (
              <li
                key={`${r.short}-${i}`}
                className={`trade-advice__reason trade-advice__reason--${r.direction}`}
              >
                <span className="trade-advice__reason-mark" aria-hidden>
                  {r.direction === 'bull' ? '+' : r.direction === 'bear' ? '−' : '○'}
                </span>
                <span>{r.short}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasForecast && onEnableForecast && (
        <div className="trade-advice__boost app-card">
          <p>
            Aggiungi la <strong>previsione</strong> per includere scenari futuri nel consiglio.
          </p>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={onEnableForecast}
            disabled={loadingForecast}
          >
            {loadingForecast ? 'Calcolo…' : 'Includi previsione'}
          </button>
        </div>
      )}

      <div className="trade-advice__details-wrap">
        <button
          type="button"
          className="btn btn--ghost btn--small trade-advice__details-toggle"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? 'Nascondi dettaglio segnali' : 'Mostra tutti i segnali'}
        </button>
        {showDetails && (
          <section className="app-card trade-advice__signals">
            <ul className="trade-advice__list">
              {advice.signals.map((s) => (
                <li
                  key={s.id}
                  className={`trade-advice__signal trade-advice__signal--${s.direction}`}
                >
                  <span className="trade-advice__signal-icon" aria-hidden>
                    {s.direction === 'bull' ? '↑' : s.direction === 'bear' ? '↓' : '→'}
                  </span>
                  <div className="trade-advice__signal-body">
                    <strong>{s.label}</strong>
                    {s.detail && <p>{s.detail}</p>}
                  </div>
                  {s.weight !== 0 && (
                    <span
                      className={`trade-advice__weight ${s.weight > 0 ? 'is-bull' : 'is-bear'}`}
                    >
                      {s.weight > 0 ? '+' : ''}
                      {s.weight}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="trade-advice__disclaimer" role="note">
        {advice.disclaimer}
      </p>
    </div>
  );
}
