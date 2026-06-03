import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatShortDate } from '../utils/format';

const REGIME_CLASS = {
  bull: 'regime--bull',
  bear: 'regime--bear',
  sideways: 'regime--side',
  high_volatility: 'regime--vol',
  crisis: 'regime--crisis',
};

const DIM_LABELS = {
  fear: 'Paura',
  uncertainty: 'Incertezza',
  optimism: 'Ottimismo',
  risk: 'Rischio',
  volatility: 'Volatilità',
};

function SentimentBars({ dimensions }) {
  if (!dimensions || !Object.keys(dimensions).length) return null;
  const data = Object.entries(dimensions).map(([k, v]) => ({
    name: DIM_LABELS[k] || k,
    value: Number((v * 100).toFixed(1)),
  }));

  return (
    <div className="adv-dash__chart-block">
      <h4>Sentiment finanziario (NLP locale)</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CorrelationHeatmap({ cells, correlationMeta }) {
  const assetCells = cells?.filter((c) => c.group === 'asset') ?? [];
  const macroCells = cells?.filter((c) => c.group === 'macro') ?? [];
  const fallback = cells ?? [];

  if (!fallback.length) {
    return <p className="adv-dash__muted">Correlazioni non disponibili.</p>;
  }

  const renderGroup = (title, groupCells) =>
    groupCells.length ? (
      <div className="adv-dash__heat-group">
        <h5>{title}</h5>
        <div className="adv-dash__heatmap">
          {groupCells.map((c) => (
            <div
              key={c.id}
              className={`adv-dash__heat-cell adv-dash__heat-cell--${c.tone}`}
              style={{ opacity: 0.45 + (c.intensity || 0) * 0.55 }}
              title={`${c.label} · ${c.interpretation || ''}`}
            >
              <span className="adv-dash__heat-label">{c.label}</span>
              <strong>{c.value != null ? c.value.toFixed(2) : '—'}</strong>
              {c.interpretation && (
                <span className="adv-dash__heat-interp">{c.interpretation}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="adv-dash__heat-wrap">
      {renderGroup('Confronto asset', assetCells.length ? assetCells : correlationMeta?.asset?.map((r) => ({
        id: r.id,
        label: r.label,
        value: r.correlation,
        intensity: r.strength,
        tone: r.tone,
        interpretation: r.interpretation,
      })))}
      {renderGroup('Benchmark macro', macroCells.length ? macroCells : correlationMeta?.macro?.map((r) => ({
        id: r.id,
        label: r.label,
        value: r.correlation,
        intensity: r.strength,
        tone: r.tone,
        interpretation: r.interpretation,
      })))}
      {!assetCells.length && !macroCells.length && (
        <div className="adv-dash__heatmap">
          {fallback.map((c) => (
            <div
              key={c.id}
              className={`adv-dash__heat-cell adv-dash__heat-cell--${c.tone}`}
              style={{ opacity: 0.45 + (c.intensity || 0) * 0.55 }}
              title={c.label}
            >
              <span className="adv-dash__heat-label">{c.label}</span>
              <strong>{c.value != null ? c.value.toFixed(2) : '—'}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventTimeline({ timeline }) {
  if (!timeline?.length) return null;
  return (
    <ul className="adv-dash__timeline">
      {timeline.map((ev, i) => (
        <li key={`${ev.date}-${i}`} className="adv-dash__timeline-item">
          <time>{formatShortDate(ev.date)}</time>
          <span className="adv-dash__timeline-src">{ev.source}</span>
          {ev.event && <span className="adv-dash__timeline-event">{ev.event}</span>}
          <p>{ev.title}</p>
          <span
            className={
              ev.normalized >= 0 ? 'adv-dash__timeline-sent--pos' : 'adv-dash__timeline-sent--neg'
            }
          >
            {(ev.normalized * 100).toFixed(0)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function RiskPanel({ risk }) {
  if (!risk) return null;
  return (
    <dl className="adv-dash__risk-grid">
      <div>
        <dt>ATR (14)</dt>
        <dd>
          {risk.atr?.value ?? '—'}
          {risk.atr?.pctOfPrice != null && (
            <span className="adv-dash__muted"> ({risk.atr.pctOfPrice}%)</span>
          )}
        </dd>
      </div>
      <div>
        <dt>Max drawdown</dt>
        <dd>{risk.drawdown?.maxDrawdown != null ? `${risk.drawdown.maxDrawdown}%` : '—'}</dd>
      </div>
      <div>
        <dt>Beta vs SPY</dt>
        <dd>{risk.beta?.beta ?? '—'}</dd>
      </div>
      <div>
        <dt>VIX</dt>
        <dd>{risk.vix?.price != null ? Number(risk.vix.price).toFixed(2) : risk.vix?.error ?? '—'}</dd>
      </div>
      <div>
        <dt>Bollinger bandwidth</dt>
        <dd>{risk.bollingerVolatility?.bandwidth ?? '—'}</dd>
      </div>
    </dl>
  );
}

function AlertsList({ alerts }) {
  if (!alerts?.length) {
    return <p className="adv-dash__muted">Nessun alert attivo.</p>;
  }
  return (
    <ul className="adv-dash__alerts">
      {alerts.map((a, i) => (
        <li key={i} className={`adv-dash__alert adv-dash__alert--${a.level}`}>
          <span className="adv-dash__alert-type">{a.type}</span>
          {a.message}
        </li>
      ))}
    </ul>
  );
}

export default function AdvancedDashboard({ intelligence, loading }) {
  if (loading && !intelligence) {
    return <div className="adv-dash adv-dash--loading">Caricamento intelligence engine…</div>;
  }
  if (!intelligence) return null;

  const geo = intelligence.geopolitical;
  const regime = intelligence.regime;
  const hybrid = intelligence.hybrid;

  return (
    <div className="adv-dash">
      <div className="adv-dash__header">
        {regime && (
          <span className={`adv-dash__regime ${REGIME_CLASS[regime.regime] || ''}`}>
            {regime.label} ({Math.round(regime.confidence * 100)}%)
          </span>
        )}
        {geo?.impactScore && (
          <span className="adv-dash__gis">
            GIS: <strong>{geo.impactScore.index}</strong>
          </span>
        )}
        {hybrid?.combined != null && (
          <span className="adv-dash__hybrid">
            Ibrida: <strong>{Number(hybrid.combined).toFixed(2)}</strong>
          </span>
        )}
      </div>

      <div className="adv-dash__grid">
        <section className="adv-dash__panel">
          <h4>Risk engine</h4>
          <RiskPanel risk={intelligence.risk} />
        </section>
        <section className="adv-dash__panel">
          <h4>Alert intelligenti</h4>
          <AlertsList alerts={intelligence.alerts} />
        </section>
        <section className="adv-dash__panel adv-dash__panel--wide">
          <SentimentBars dimensions={geo?.sentiment?.dimensions} />
        </section>
        <section className="adv-dash__panel adv-dash__panel--wide">
          <h4>Correlazioni mercati</h4>
          <CorrelationHeatmap
            cells={intelligence.heatmap}
            correlationMeta={intelligence.correlationMeta}
          />
        </section>
        <section className="adv-dash__panel adv-dash__panel--wide">
          <h4>Timeline eventi geopolitici</h4>
          <EventTimeline timeline={geo?.sentimentTimeline} />
        </section>
        {intelligence.ml?.polynomial && (
          <section className="adv-dash__panel">
            <h4>ML — Polinomio grado 2</h4>
            <p className="adv-dash__muted">
              Prossimo:{' '}
              {intelligence.ml.polynomial.forecasts?.[0]?.price?.toFixed(2) ?? '—'}
            </p>
          </section>
        )}
        {intelligence.ml?.randomForest && (
          <section className="adv-dash__panel">
            <h4>ML — Random Forest ({intelligence.ml.randomForest.trees} alberi)</h4>
            <p className="adv-dash__muted">
              Prossimo: {intelligence.ml.randomForest.nextPrice?.toFixed(2) ?? '—'}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
