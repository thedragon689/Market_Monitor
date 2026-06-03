import { useState } from 'react';

const API_BASE = 'http://localhost:4000';

function formatPrice(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toFixed(2);
}

function ForecastTable({ forecasts }) {
  if (!forecasts?.length) return <p>Nessuna previsione disponibile.</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
          <th style={{ padding: '0.35rem 0.5rem' }}>Giorno</th>
          <th style={{ padding: '0.35rem 0.5rem' }}>Prezzo previsto</th>
        </tr>
      </thead>
      <tbody>
        {forecasts.map((row) => (
          <tr key={row.dayOffset} style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '0.35rem 0.5rem' }}>+{row.dayOffset}</td>
            <td style={{ padding: '0.35rem 0.5rem' }}>${formatPrice(row.price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MethodCard({ method, accent }) {
  if (!method) return null;
  if (method.error) {
    return (
      <div style={{ ...cardStyle, borderColor: '#522' }}>
        <p style={{ color: '#f88', margin: 0 }}>{method.error}</p>
      </div>
    );
  }

  return (
    <div style={{ ...cardStyle, borderColor: accent }}>
      <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{method.label}</h3>
      <code style={{ fontSize: '0.8rem', color: '#aaa' }}>{method.formula}</code>
      <p style={{ fontSize: '0.85rem', color: '#bbb', margin: '0.5rem 0' }}>{method.description}</p>

      {method.coefficients && (
        <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
          <strong>a</strong> (pendenza): {method.coefficients.slope.toFixed(6)}
          <br />
          <strong>b</strong> (intercetta): {method.coefficients.intercept.toFixed(6)}
          <br />
          <span style={{ color: '#888' }}>{method.equation}</span>
        </p>
      )}

      {method.window != null && (
        <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
          Finestra N = {method.window}
        </p>
      )}

      <p style={{ margin: '0.5rem 0 0.25rem' }}>
        Prossimo giorno: <strong style={{ color: accent }}>${formatPrice(method.nextDay)}</strong>
      </p>
      <ForecastTable forecasts={method.forecasts} />
    </div>
  );
}

const cardStyle = {
  flex: 1,
  minWidth: 280,
  background: '#111',
  border: '1px solid',
  borderRadius: 8,
  padding: '1rem',
};

function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [type, setType] = useState('stock');
  const [windowN, setWindowN] = useState(5);
  const [horizonDays, setHorizonDays] = useState(5);
  const [forecastMethod, setForecastMethod] = useState('both');
  const [quotes, setQuotes] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState(null);

  const loadQuotes = async () => {
    try {
      setLoadingQuotes(true);
      setError(null);
      const res = await fetch(
        `${API_BASE}/api/quotes?symbols=${encodeURIComponent(symbol)}&type=${type}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore nel caricamento quotazioni');
      setQuotes(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const loadForecast = async () => {
    try {
      setLoadingForecast(true);
      setError(null);
      const params = new URLSearchParams({
        symbol,
        type,
        days: String(horizonDays),
        window: String(windowN),
        method: forecastMethod,
      });
      const res = await fetch(`${API_BASE}/api/forecast?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore nel calcolo previsione');
      setForecast(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingForecast(false);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui', padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
      <h1>Market Monitor & Forecast</h1>

      <section style={{ marginBottom: '1rem' }}>
        <label>
          <strong>Tipo: </strong>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="stock">Azione</option>
            <option value="metal">Metallo / commodity</option>
          </select>
        </label>
        <br />
        <label style={{ marginTop: '0.5rem', display: 'inline-block' }}>
          <strong>Simbolo: </strong>
          <input
            style={{ marginLeft: '0.5rem', minWidth: '160px' }}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder={type === 'stock' ? 'AAPL' : 'XAUUSD'}
          />
        </label>

        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <label>
            <strong>N (media mobile): </strong>
            <input
              type="number"
              min={2}
              max={60}
              value={windowN}
              onChange={(e) => setWindowN(Number(e.target.value))}
              style={{ width: 56, marginLeft: '0.35rem' }}
            />
          </label>
          <label>
            <strong>Giorni previsti: </strong>
            <input
              type="number"
              min={1}
              max={30}
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              style={{ width: 56, marginLeft: '0.35rem' }}
            />
          </label>
          <label>
            <strong>Metodo: </strong>
            <select
              value={forecastMethod}
              onChange={(e) => setForecastMethod(e.target.value)}
              style={{ marginLeft: '0.35rem' }}
            >
              <option value="both">Entrambi</option>
              <option value="sma">Solo media mobile</option>
              <option value="linear">Solo regressione lineare</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <button type="button" onClick={loadQuotes} disabled={loadingQuotes}>
            Carica quotazioni
          </button>
          <button
            type="button"
            onClick={loadForecast}
            disabled={loadingForecast}
            style={{ marginLeft: '0.5rem' }}
          >
            Calcola previsione
          </button>
        </div>
      </section>

      {error && (
        <div style={{ color: '#f66', marginBottom: '1rem', padding: '0.75rem', background: '#211' }}>
          <strong>Errore:</strong> {error}
        </div>
      )}

      <section style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h2>Quotazioni attuali</h2>
          {loadingQuotes && <p>Caricamento…</p>}
          {!loadingQuotes && quotes && (
            <pre style={{ background: '#111', color: '#8f8', padding: '1rem', overflowX: 'auto', borderRadius: 8 }}>
              {JSON.stringify(quotes, null, 2)}
            </pre>
          )}
        </div>

        <div style={{ flex: 2, minWidth: 300 }}>
          <h2>Previsioni</h2>
          {loadingForecast && <p>Calcolo in corso…</p>}
          {!loadingForecast && forecast && (
            <>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                Ultimo prezzo storico: <strong>${formatPrice(forecast.lastPrice)}</strong>
                {' · '}
                {forecast.historicalPoints} punti usati
                {forecast.proxy ? ` · ${forecast.proxy}` : ''}
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <MethodCard method={forecast.methods?.sma} accent="#6f6" />
                <MethodCard method={forecast.methods?.linearRegression} accent="#6cf" />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
