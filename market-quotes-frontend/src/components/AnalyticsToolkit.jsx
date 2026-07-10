import { useEffect, useState } from 'react';
import { API_BASE } from '../config/api';
import { apiFetch } from '../utils/apiFetch';
import { PanelWidgetSkeleton } from '../components/ui/DataWidgetSkeleton';
import './analytics-toolkit.css';

function Metric({ label, value }) {
  return (
    <div className="atk-metric">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  );
}

function BacktestBlock({ symbol, type }) {
  const [data, setData] = useState(null);
  const [strategy, setStrategy] = useState('buy_hold');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ symbol, type, strategy });
    apiFetch(`${API_BASE}/api/backtest?${params}`)
      .then(({ data: d }) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, type, strategy]);

  if (!data) return <PanelWidgetSkeleton label="Backtest…" lines={3} />;

  return (
    <div className="atk-block">
      <div className="atk-block__head">
        <h4>Backtesting</h4>
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)} aria-label="Strategia">
          <option value="buy_hold">Buy &amp; Hold</option>
          <option value="sma_cross">SMA Cross 20/50</option>
        </select>
      </div>
      <div className="atk-metrics">
        <Metric label="Return %" value={data.metrics?.totalReturnPct} />
        <Metric label="Sharpe" value={data.metrics?.sharpe} />
        <Metric label="Sortino" value={data.metrics?.sortino} />
        <Metric label="Max DD %" value={data.metrics?.maxDrawdownPct} />
      </div>
    </div>
  );
}

function FundamentalsBlock({ symbol, type }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams({ symbol, type });
    apiFetch(`${API_BASE}/api/fundamentals?${params}`)
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null));
  }, [symbol, type]);

  if (!data) return <PanelWidgetSkeleton label="Fondamentali…" lines={3} />;
  if (!data.available) return <p className="atk-muted">{data.reason}</p>;

  return (
    <div className="atk-block">
      <h4>Fondamentali</h4>
      <div className="atk-metrics">
        <Metric label="P/E" value={data.pe} />
        <Metric label="EPS" value={data.eps} />
        <Metric label="Div. yield %" value={data.dividendYield} />
        <Metric label="Margin %" value={data.profitMargin} />
      </div>
    </div>
  );
}

function CalendarBlock() {
  const [data, setData] = useState(null);
  useEffect(() => {
    apiFetch(`${API_BASE}/api/economic-calendar`)
      .then(({ data: d }) => setData(d))
      .catch(() => setData({ events: [] }));
  }, []);

  if (!data) return <PanelWidgetSkeleton label="Calendario macro…" lines={4} />;

  return (
    <div className="atk-block">
      <h4>Calendario economico</h4>
      <ul className="atk-list">
        {(data.events ?? []).slice(0, 8).map((e, i) => (
          <li key={`${e.date}-${i}`} className={`atk-impact atk-impact--${e.impact?.toLowerCase()}`}>
            <time>{e.date} {e.time}</time>
            <span>{e.country}</span>
            <strong>{e.title}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialBlock() {
  const [data, setData] = useState(null);
  useEffect(() => {
    apiFetch(`${API_BASE}/api/sentiment/social?limit=12`)
      .then(({ data: d }) => setData(d))
      .catch(() => setData({ posts: [] }));
  }, []);

  if (!data) return <PanelWidgetSkeleton label="Social sentiment…" lines={4} />;

  return (
    <div className="atk-block">
      <h4>Social sentiment (Reddit)</h4>
      {data.topMentions?.length > 0 && (
        <p className="atk-tags">
          {data.topMentions.map((m) => (
            <span key={m.symbol} className="atk-tag">
              ${m.symbol} ×{m.count}
            </span>
          ))}
        </p>
      )}
      <ul className="atk-list atk-list--compact">
        {(data.posts ?? []).slice(0, 6).map((p) => (
          <li key={p.id}>
            <a href={p.url} target="_blank" rel="noreferrer">
              {p.title}
            </a>
            <span className="atk-muted">↑{p.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderBookBlock({ symbol, type }) {
  const [book, setBook] = useState(null);
  useEffect(() => {
    if (type !== 'crypto') return undefined;
    const params = new URLSearchParams({ symbol, type });
    const id = setInterval(() => {
      apiFetch(`${API_BASE}/api/orderbook?${params}`).then(({ data }) => setBook(data)).catch(() => {});
    }, 5000);
    apiFetch(`${API_BASE}/api/orderbook?${params}`).then(({ data }) => setBook(data)).catch(() => {});
    return () => clearInterval(id);
  }, [symbol, type]);

  if (type !== 'crypto') {
    return <p className="atk-muted">Order book disponibile per asset crypto.</p>;
  }
  if (!book) return <PanelWidgetSkeleton label="Order book…" lines={4} />;

  return (
    <div className="atk-block">
      <h4>Order book (Binance)</h4>
      <p className="atk-muted">Spread: {book.spread ?? '—'}</p>
      <div className="atk-book">
        <div>
          <span className="atk-book__label">Bid</span>
          {book.bids?.slice(0, 8).map((b, i) => (
            <div key={i} className="atk-book__row atk-book__row--bid">
              <span>{b.price}</span>
              <span>{b.qty}</span>
            </div>
          ))}
        </div>
        <div>
          <span className="atk-book__label">Ask</span>
          {book.asks?.slice(0, 8).map((a, i) => (
            <div key={i} className="atk-book__row atk-book__row--ask">
              <span>{a.price}</span>
              <span>{a.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnomaliesBlock({ anomalies }) {
  if (!anomalies?.length) return <p className="atk-muted">Nessuna anomalia rilevata sul periodo recente.</p>;
  return (
    <ul className="atk-list">
      {anomalies.map((a, i) => (
        <li key={`${a.date}-${i}`} className={`atk-anomaly atk-anomaly--${a.severity}`}>
          <time>{a.date}</time>
          <span>{a.type}</span>
          <strong>z={a.zScore}</strong>
          <span>{a.returnPct}%</span>
        </li>
      ))}
    </ul>
  );
}

/** Toolkit analytics: backtest, fondamentali, calendario, social, order book, anomalie. */
export default function AnalyticsToolkit({ symbol, type, anomalies }) {
  return (
    <section className="atk app-card ui-card--glass" aria-label="Analytics avanzate">
      <header className="atk__head">
        <h3>Analytics avanzate</h3>
        <p className="atk-muted">Backtest, fondamentali, macro, social e order book</p>
      </header>
      <div className="atk__grid">
        <BacktestBlock symbol={symbol} type={type} />
        <FundamentalsBlock symbol={symbol} type={type} />
        <CalendarBlock />
        <SocialBlock />
        <OrderBookBlock symbol={symbol} type={type} />
        <div className="atk-block">
          <h4>Anomalie prezzo</h4>
          <AnomaliesBlock anomalies={anomalies} />
        </div>
      </div>
    </section>
  );
}
