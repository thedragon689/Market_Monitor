import { useState } from 'react';
import { MARKET_CATEGORIES } from '../../data/categories';
import { parsePositiveInput } from '../../utils/portfolioFormat';

const TYPE_OPTIONS = MARKET_CATEGORIES.map((t) => ({ id: t.id, label: t.label }));

export default function PortfolioAddAsset({ onBack, onSubmit, loading, error }) {
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState('stock');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [alertGain, setAlertGain] = useState('');
  const [alertLoss, setAlertLoss] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      onSubmit?.({
        symbol: symbol.trim().toUpperCase(),
        assetType,
        quantity: parsePositiveInput(quantity, 'Quantità'),
        avgPrice: parsePositiveInput(avgPrice, 'Prezzo medio'),
        alertGain: alertGain !== '' ? Number(alertGain) : null,
        alertLoss: alertLoss !== '' ? Number(alertLoss) : null,
      });
    } catch (err) {
      onSubmit?.({ error: err.message });
    }
  };

  return (
    <section className="portfolio-add app-card">
      <header className="portfolio-add__head">
        <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>
          ← Indietro
        </button>
        <h2>Aggiungi asset</h2>
      </header>

      <form className="portfolio-add__form" onSubmit={handleSubmit}>
        <label className="portfolio-field">
          <span>Simbolo</span>
          <input
            type="text"
            required
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="es. AAPL, BTC-USD, ENEL.MI"
            autoCapitalize="characters"
          />
        </label>

        <label className="portfolio-field">
          <span>Categoria</span>
          <select value={assetType} onChange={(e) => setAssetType(e.target.value)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="portfolio-field">
          <span>Quantità</span>
          <input
            type="number"
            required
            min="0.00000001"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="es. 10"
          />
        </label>

        <label className="portfolio-field">
          <span>Prezzo medio di acquisto</span>
          <input
            type="number"
            required
            min="0.00000001"
            step="any"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
            placeholder="es. 150.25"
          />
        </label>

        <div className="portfolio-add__alerts">
          <p className="portfolio-add__alerts-title">Alert automatici (opzionale)</p>
          <label className="portfolio-field">
            <span>Soglia guadagno %</span>
            <input
              type="number"
              step="any"
              value={alertGain}
              onChange={(e) => setAlertGain(e.target.value)}
              placeholder="es. 15 (alert se P/L ≥ 15%)"
            />
          </label>
          <label className="portfolio-field">
            <span>Soglia perdita %</span>
            <input
              type="number"
              step="any"
              max="0"
              value={alertLoss}
              onChange={(e) => setAlertLoss(e.target.value)}
              placeholder="es. -10 (alert se P/L ≤ -10%)"
            />
          </label>
        </div>

        {error && (
          <p className="portfolio-auth__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Salvataggio…' : 'Aggiungi al portfolio'}
        </button>
      </form>
    </section>
  );
}
