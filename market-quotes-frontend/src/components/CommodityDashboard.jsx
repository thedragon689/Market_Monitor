import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COMMODITY_FAMILY_LABELS } from '../data/commoditySymbols';
function formatNum(value, digits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value).toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function MetricCard({ label, value, hint, tone = '' }) {
  return (
    <div className={`commodity-metric ${tone ? `commodity-metric--${tone}` : ''}`}>
      <span className="commodity-metric__label">{label}</span>
      <strong className="commodity-metric__value">{value ?? '—'}</strong>
      {hint && <span className="commodity-metric__hint">{hint}</span>}
    </div>
  );
}

function StructureBadge({ structure, label }) {
  if (!structure) return null;
  return (
    <span className={`commodity-structure commodity-structure--${structure}`}>
      {label ?? structure}
    </span>
  );
}

export default function CommodityDashboard({ profile, loading, fx }) {
  if (loading && !profile) {
    return (
      <div className="commodity-dashboard commodity-dashboard--loading">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--chart" />
      </div>
    );
  }

  if (!profile || profile.error) {
    return null;
  }

  const { market, futures, indicators, macro, models, news, fundamentals } = profile;
  const familyLabel = COMMODITY_FAMILY_LABELS[profile.profile?.family] ?? profile.profile?.family;

  const curveData = (futures?.points ?? []).map((p) => ({
    name: p.label,
    price: p.price,
    synthetic: p.synthetic,
    tenor: p.tenor,
  }));

  const curveColor = (entry) => {
    if (entry.tenor === 'spot') return 'var(--chart-line)';
    return entry.synthetic ? 'var(--text-muted)' : 'var(--chart-arima)';
  };

  return (
    <div className="commodity-dashboard">
      <header className="commodity-dashboard__head">
        <div>
          <h3 className="commodity-dashboard__title">
            Materie prime · {profile.profile?.name}
          </h3>
          <p className="commodity-dashboard__sub">
            {familyLabel} · {profile.profile?.unit}
            {profile.profile?.proxy && ` · ${profile.profile.proxy}`}
          </p>
        </div>
        <StructureBadge structure={futures?.structure} label={futures?.structureLabel} />
      </header>

      <div className="commodity-dashboard__metrics">
        <MetricCard label="Spot" value={formatNum(market?.spot, 2)} />
        <MetricCard
          label="Var. %"
          value={market?.changePercent != null ? `${market.changePercent}%` : null}
          tone={
            market?.changePercent > 0 ? 'up' : market?.changePercent < 0 ? 'down' : ''
          }
        />
        <MetricCard label="High giorno" value={formatNum(market?.dayHigh, 2)} />
        <MetricCard label="Low giorno" value={formatNum(market?.dayLow, 2)} />
        <MetricCard
          label="Volume"
          value={market?.volume != null ? market.volume.toLocaleString('it-IT') : null}
        />
        <MetricCard
          label="Open interest"
          value={
            market?.openInterest != null
              ? market.openInterest.toLocaleString('it-IT')
              : null
          }
        />
        <MetricCard
          label="Volatilità 20gg"
          value={
            market?.historicalVolatility?.annualized != null
              ? `${market.historicalVolatility.annualized}%`
              : null
          }
          hint="annualizzata"
        />
      </div>

      {curveData.length > 0 && (
        <section className="commodity-dashboard__section">
          <h4>Forward curve</h4>
          <p className="commodity-dashboard__lead">{futures?.interpretation}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={curveData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={56} />
              <Tooltip
                formatter={(v) => [formatNum(v, 2), 'Prezzo']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                {curveData.map((entry) => (
                  <Cell key={entry.name} fill={curveColor(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {indicators && (
        <section className="commodity-dashboard__section">
          <h4>Indicatori commodity</h4>
          <dl className="commodity-dashboard__grid">
            <div><dt>CCI (20)</dt><dd>{formatNum(indicators.cci20, 1)}</dd></div>
            <div><dt>Williams %R</dt><dd>{formatNum(indicators.williamsR14, 1)}</dd></div>
            <div><dt>ATR (14)</dt><dd>{formatNum(indicators.atr14?.value, 4)}</dd></div>
            <div><dt>Momentum (14)</dt><dd>{formatNum(indicators.momentum14, 2)}%</dd></div>
            <div><dt>RSI (14)</dt><dd>{formatNum(indicators.rsi14, 1)}</dd></div>
            <div><dt>Bollinger</dt><dd>
              {indicators.bollinger
                ? `${formatNum(indicators.bollinger.lower)} – ${formatNum(indicators.bollinger.upper)}`
                : '—'}
            </dd></div>
          </dl>
        </section>
      )}

      {macro?.factors?.length > 0 && (
        <section className="commodity-dashboard__section">
          <h4>Macro (DXY, inflazione, risk-on)</h4>
          <ul className="commodity-dashboard__macro">
            {macro.factors.map((f) => (
              <li key={f.id}>
                <span>{f.label}</span>
                <strong>{formatNum(f.price, 2)}</strong>
                {f.changePct != null && (
                  <span className={f.changePct >= 0 ? 'up' : 'down'}>
                    {f.changePct > 0 ? '+' : ''}
                    {f.changePct}%
                  </span>
                )}
              </li>
            ))}
          </ul>
          {macro.narrative?.map((n) => (
            <p key={n} className="commodity-dashboard__note">{n}</p>
          ))}
        </section>
      )}

      {models && (
        <section className="commodity-dashboard__section">
          <h4>Modelli predittivi</h4>
          <dl className="commodity-dashboard__grid commodity-dashboard__grid--models">
            <div><dt>ARIMA</dt><dd>{formatNum(models.arima?.nextPrice, 2)}</dd></div>
            <div><dt>LSTM</dt><dd>{formatNum(models.lstm?.nextPrice, 2)}</dd></div>
            <div><dt>Prophet</dt><dd>{formatNum(models.prophet?.nextPrice, 2)}</dd></div>
            <div><dt>Ibrido ARIMA+LSTM</dt><dd>{formatNum(models.hybrid?.nextPrice, 2)}</dd></div>
          </dl>
        </section>
      )}

      {fundamentals?.blocks?.length > 0 && (
        <section className="commodity-dashboard__section">
          <h4>Produzione, scorte e clima</h4>
          {fundamentals.blocks.map((b) => (
            <div key={b.title} className="commodity-dashboard__block">
              <strong>{b.title}</strong>
              {b.source && <span className="commodity-dashboard__source">{b.source}</span>}
              <ul>
                {(b.items ?? [b.metric]).filter(Boolean).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {b.link && (
                <a href={b.link} target="_blank" rel="noopener noreferrer" className="commodity-dashboard__link">
                  Report ufficiale →
                </a>
              )}
            </div>
          ))}
        </section>
      )}

      {news?.articles?.length > 0 && (
        <section className="commodity-dashboard__section">
          <h4>News & sentiment ({news.sentiment >= 0 ? '+' : ''}{news.sentiment})</h4>
          <ul className="commodity-dashboard__news">
            {news.articles.slice(0, 6).map((a) => (
              <li key={a.id ?? a.link}>
                <a href={a.link} target="_blank" rel="noopener noreferrer">
                  {a.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.dataNotes?.length > 0 && (
        <footer className="commodity-dashboard__footnotes">
          {profile.dataNotes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </footer>
      )}
    </div>
  );
}
