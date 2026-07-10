import { useEffect, useState } from 'react';
import { fmtMoney, fmtPercent, parsePositiveInput, toneFromPct } from '../../utils/portfolioFormat';
import { updatePortfolioAlerts } from '../../utils/portfolioApi';
import PortfolioAssetChart from './PortfolioAssetChart';
import VirtualTransactionList from './VirtualTransactionList';
import { PortfolioDetailSkeleton } from './PortfolioSkeleton';

export default function PortfolioAssetDetail({
  asset,
  loading,
  onBack,
  onAddTransaction,
  onAlertsUpdated,
  txLoading,
  txError,
  alertError,
}) {
  const [txType, setTxType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [alertGain, setAlertGain] = useState('');
  const [alertLoss, setAlertLoss] = useState('');
  const [alertLoading, setAlertLoading] = useState(false);
  const [localAlertError, setLocalAlertError] = useState(null);
  const [txValidationError, setTxValidationError] = useState(null);

  useEffect(() => {
    if (!asset) return;
    setAlertGain(asset.alertGain != null ? String(asset.alertGain) : '');
    setAlertLoss(asset.alertLoss != null ? String(asset.alertLoss) : '');
  }, [asset?.id, asset?.alertGain, asset?.alertLoss]);

  if (loading && !asset) {
    return <PortfolioDetailSkeleton />;
  }

  if (!asset) {
    return (
      <section className="portfolio-detail app-card">
        <p>Asset non trovato.</p>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Indietro
        </button>
      </section>
    );
  }

  const ccy = asset.currency || asset.quote?.currency || 'USD';
  const tone = toneFromPct(asset.plPercent);

  const handleTx = (e) => {
    e.preventDefault();
    setTxValidationError(null);
    try {
      onAddTransaction?.({
        type: txType,
        quantity: parsePositiveInput(quantity, 'Quantità'),
        price: parsePositiveInput(price, 'Prezzo'),
      });
    } catch (err) {
      setTxValidationError(err.message);
    }
  };

  const handleAlerts = async (e) => {
    e.preventDefault();
    setAlertLoading(true);
    setLocalAlertError(null);
    try {
      await updatePortfolioAlerts(asset.symbol, {
        alertGain: alertGain !== '' ? Number(alertGain) : null,
        alertLoss: alertLoss !== '' ? Number(alertLoss) : null,
      });
      onAlertsUpdated?.();
    } catch (err) {
      setLocalAlertError(err.message);
    } finally {
      setAlertLoading(false);
    }
  };

  const displayAlertError = localAlertError || alertError;

  return (
    <div className="portfolio-detail">
      <section className="portfolio-detail__hero app-card">
        <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>
          ← Portfolio
        </button>
        <h2 className="portfolio-detail__symbol">{asset.symbol}</h2>
        <p className="portfolio-detail__type">{asset.assetType}</p>

        <div className="portfolio-detail__kpis">
          <div className="portfolio-metric">
            <span className="portfolio-metric__label">Quantità</span>
            <strong className="portfolio-metric__value">
              {asset.quantity.toLocaleString('it-IT', { maximumFractionDigits: 6 })}
            </strong>
          </div>
          <div className="portfolio-metric">
            <span className="portfolio-metric__label">Prezzo medio</span>
            <strong className="portfolio-metric__value">{fmtMoney(asset.avgPrice, ccy)}</strong>
          </div>
          <div className="portfolio-metric">
            <span className="portfolio-metric__label">Valore attuale</span>
            <strong className="portfolio-metric__value">{fmtMoney(asset.currentValue, ccy)}</strong>
          </div>
          <div className="portfolio-metric">
            <span className="portfolio-metric__label">P/L</span>
            <strong className={`portfolio-metric__value portfolio-metric__value--${tone}`}>
              {fmtMoney(asset.pl, ccy)}
            </strong>
          </div>
          <div className="portfolio-metric">
            <span className="portfolio-metric__label">P/L %</span>
            <strong className={`portfolio-metric__value portfolio-metric__value--${tone}`}>
              {asset.plPercent != null ? fmtPercent(asset.plPercent) : '—'}
            </strong>
          </div>
        </div>
      </section>

      <PortfolioAssetChart symbol={asset.symbol} assetType={asset.assetType} currency={ccy} />

      <section className="portfolio-detail__alerts app-card">
        <h3>Alert automatici</h3>
        <form className="portfolio-add__form" onSubmit={handleAlerts}>
          <label className="portfolio-field">
            <span>Soglia guadagno %</span>
            <input
              type="number"
              step="any"
              min="0"
              value={alertGain}
              onChange={(e) => setAlertGain(e.target.value)}
              placeholder="es. 15"
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
              placeholder="es. -10"
            />
          </label>
          {displayAlertError && (
            <p className="portfolio-auth__error" role="alert">
              {displayAlertError}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={alertLoading}>
            {alertLoading ? 'Salvataggio…' : 'Salva alert'}
          </button>
        </form>
      </section>

      <section className="portfolio-detail__tx app-card">
        <h3>Nuova transazione</h3>
        <form className="portfolio-add__form" onSubmit={handleTx}>
          <div className="portfolio-tx-toggle">
            <button
              type="button"
              className={`btn btn--small ${txType === 'buy' ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setTxType('buy')}
            >
              Acquisto
            </button>
            <button
              type="button"
              className={`btn btn--small ${txType === 'sell' ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setTxType('sell')}
            >
              Vendita
            </button>
          </div>
          <label className="portfolio-field">
            <span>Quantità</span>
            <input
              type="number"
              required
              min="0.00000001"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label className="portfolio-field">
            <span>Prezzo</span>
            <input
              type="number"
              required
              min="0.00000001"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          {(txValidationError || txError) && (
            <p className="portfolio-auth__error" role="alert">
              {txValidationError || txError}
            </p>
          )}
          <button type="submit" className="btn btn--cta btn--block" disabled={txLoading}>
            {txLoading ? 'Salvataggio…' : 'Registra transazione'}
          </button>
        </form>
      </section>

      <section className="portfolio-detail__history app-card">
        <h3>Storico transazioni</h3>
        <VirtualTransactionList transactions={asset.transactions} currency={ccy} />
      </section>
    </div>
  );
}
