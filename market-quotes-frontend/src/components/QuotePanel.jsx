import { getSymbolMeta } from '../data/symbols';
import EmptyState from './EmptyState';
import { changeSummary, formatPercent, formatPrice, usdToEur } from '../utils/format';
import {
  buildDisplayPricing,
  formatPerGram,
  spotLbToGramPrice,
  spotOzToGramPrice,
} from '../utils/pricing';

function TrendIcon({ tone }) {
  if (tone === 'up') return <span className="quote-trend__icon" aria-hidden>↑</span>;
  if (tone === 'down') return <span className="quote-trend__icon" aria-hidden>↓</span>;
  return <span className="quote-trend__icon" aria-hidden>→</span>;
}

function changeForDisplay(changeUsd, display, fx) {
  if (changeUsd == null || !Number.isFinite(changeUsd)) return null;
  const eur = usdToEur(changeUsd, fx?.eurUsd);
  if (display.kind === 'perGramTroy') {
    return {
      eur: spotOzToGramPrice(eur),
      usd: spotOzToGramPrice(changeUsd),
      isGram: true,
    };
  }
  if (display.kind === 'perGramLb') {
    return {
      eur: spotLbToGramPrice(eur),
      usd: spotLbToGramPrice(changeUsd),
      isGram: true,
    };
  }
  return { eur, usd: changeUsd, isGram: false };
}

export default function QuotePanel({
  quote,
  type,
  symbol,
  loading,
  fx,
  onGoExplore,
  variant = 'default',
  freshKey = 0,
}) {
  const meta = getSymbolMeta(symbol, type);
  const live = quote?.liveExchanges;
  const isHero = variant === 'hero';

  if (loading) {
    return (
      <div className="quote-panel quote-panel--loading">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--price" />
        <div className="skeleton skeleton--line" />
      </div>
    );
  }

  if (!quote || quote.error) {
    return (
      <div className="quote-panel quote-panel--empty">
        <EmptyState
          icon="📊"
          title="Nessuna quotazione"
          message={
            quote?.error ||
            'Seleziona un asset nel passo «Scegli» per vedere il prezzo aggiornato.'
          }
          actionLabel={onGoExplore ? 'Vai a Scegli' : undefined}
          onAction={onGoExplore}
        />
      </div>
    );
  }

  const summary = changeSummary(quote.change, quote.changePercent);
  const hasChange = quote.change != null || quote.changePercent != null;
  const changeVal = Number(quote.change);
  const changeSign = changeVal >= 0 ? '+' : '−';
  const display = buildDisplayPricing(meta, quote, fx);
  const isGram = display.primaryLabel === 'al grammo';
  const isShare = display.kind === 'perShare';
  const isCoinDisplay = display.kind === 'perCoin';
  const mainEur = display.primaryEur;
  const mainUsd = display.primaryUsd;
  const delta = changeForDisplay(changeVal, display, fx);

  return (
    <article className={`quote-panel quote-panel--${summary.tone} ${isHero ? 'quote-panel--hero' : ''}`}>
      <header className="quote-panel__header">
        <div>
          {!isHero && (
            <p className="quote-panel__eyebrow">
              {isShare
                ? 'Costo singola azione'
                : isCoinDisplay
                  ? 'Prezzo live per coin'
                  : isGram
                    ? 'Costo al grammo'
                    : 'Valore attuale'}
            </p>
          )}
          <h2 className="quote-panel__title">
            {meta.name}
            <code className="quote-panel__symbol">{quote.symbol}</code>
          </h2>
          {!isHero && <p className="quote-panel__subtitle">{meta.hint}</p>}
        </div>
        {!isHero && <span className="quote-panel__badge">{quote.symbol}</span>}
      </header>

      <div className="quote-panel__price-row">
        {mainEur != null ? (
          <p className={`quote-panel__price quote-panel__price--${summary.tone}`}>
            {isGram ? formatPerGram(mainEur, 'EUR') : formatPrice(mainEur, 'EUR')}
            {display.primaryLabel && (
              <span className="quote-panel__unit"> {display.primaryLabel}</span>
            )}
          </p>
        ) : (
          <p className={`quote-panel__price quote-panel__price--${summary.tone}`}>
            {isGram ? formatPerGram(mainUsd, 'USD') : formatPrice(mainUsd, 'USD')}
            {display.primaryLabel && (
              <span className="quote-panel__unit"> {display.primaryLabel}</span>
            )}
          </p>
        )}
        {quote.changePercent != null && (
          <span className={`quote-panel__chg-pill quote-panel__chg-pill--${summary.tone}`}>
            {formatPercent(quote.changePercent)}
          </span>
        )}
      </div>

      {mainEur != null && mainUsd != null && (
        <p className="quote-panel__price-usd">
          {isGram ? formatPerGram(mainUsd, 'USD') : formatPrice(mainUsd, 'USD')}
          {display.primaryLabel && (
            <span className="quote-panel__unit"> {display.primaryLabel}</span>
          )}
        </p>
      )}

      {isHero && (
        <div key={freshKey} className="quote-stat-cards quote-stat-cards--pulse">
          {quote.changePercent != null && (
            <div className={`quote-stat-card quote-stat-card--${summary.tone}`}>
              <span className="quote-stat-card__icon" aria-hidden>📈</span>
              <div>
                <p className="quote-stat-card__label">Variazione</p>
                <p className="quote-stat-card__value">{formatPercent(quote.changePercent)}</p>
              </div>
            </div>
          )}
          {quote.volume != null && (
            <div className="quote-stat-card">
              <span className="quote-stat-card__icon" aria-hidden>📊</span>
              <div>
                <p className="quote-stat-card__label">Volume</p>
                <p className="quote-stat-card__value">
                  {Number(quote.volume).toLocaleString('it-IT')}
                </p>
              </div>
            </div>
          )}
          {quote.high != null && (
            <div className="quote-stat-card">
              <span className="quote-stat-card__icon" aria-hidden>⬆</span>
              <div>
                <p className="quote-stat-card__label">Max giorno</p>
                <p className="quote-stat-card__value">{formatPrice(quote.high, 'USD')}</p>
              </div>
            </div>
          )}
          {quote.low != null && (
            <div className="quote-stat-card">
              <span className="quote-stat-card__icon" aria-hidden>⬇</span>
              <div>
                <p className="quote-stat-card__label">Min giorno</p>
                <p className="quote-stat-card__value">{formatPrice(quote.low, 'USD')}</p>
              </div>
            </div>
          )}
          {quote.asOf && (
            <div className="quote-stat-card quote-stat-card--muted">
              <span className="quote-stat-card__icon" aria-hidden>🕐</span>
              <div>
                <p className="quote-stat-card__label">Aggiornato</p>
                <p className="quote-stat-card__value">{quote.asOf}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <details className="quote-panel__more">
        <summary>Dettagli quotazione</summary>
        {display.secondaryEur != null && display.secondaryLabel && (
          <p className="quote-panel__reference">
            Quotazione mercato: {formatPrice(display.secondaryEur, 'EUR')}{' '}
            {display.secondaryLabel}
            {display.secondaryUsd != null && (
              <span className="quote-panel__plain-usd">
                {' '}
                ({formatPrice(display.secondaryUsd, 'USD')})
              </span>
            )}
          </p>
        )}

        <p className="quote-panel__plain">
          Oggi <strong>{display.plainUnit}</strong> costa circa{' '}
          <strong>
            {mainEur != null
              ? isGram
                ? formatPerGram(mainEur, 'EUR')
                : formatPrice(mainEur, 'EUR')
              : isGram
                ? formatPerGram(mainUsd, 'USD')
                : formatPrice(mainUsd, 'USD')}
          </strong>
          {isShare && ' (singola azione)'}
          {isCoinDisplay && ' (singola coin)'}.
        </p>

        {live && (live.binance || live.kraken) && (
          <div className="quote-panel__live-feeds">
            <p className="quote-panel__live-title">
              Stream live
              {live.status === 'connecting' && ' · connessione…'}
              {live.status === 'live' && ' · WebSocket'}
            </p>
            <ul className="quote-panel__live-list">
              {live.binance && (
                <li>
                  <strong>Binance</strong> ·{' '}
                  {formatPrice(
                    fx?.eurUsd ? usdToEur(live.binance.price, fx.eurUsd) : live.binance.price,
                    fx?.eurUsd ? 'EUR' : 'USD'
                  )}
                  {live.binance.changePercent != null && (
                    <span> ({formatPercent(live.binance.changePercent)})</span>
                  )}
                </li>
              )}
              {live.kraken && (
                <li>
                  <strong>Kraken</strong> ·{' '}
                  {formatPrice(
                    fx?.eurUsd ? usdToEur(live.kraken.price, fx.eurUsd) : live.kraken.price,
                    fx?.eurUsd ? 'EUR' : 'USD'
                  )}
                </li>
              )}
            </ul>
          </div>
        )}

        {quote.exchanges && !live?.binance && !live?.kraken && (
          <div className="quote-panel__live-feeds">
            <p className="quote-panel__live-title">Exchange REST</p>
            <ul className="quote-panel__live-list">
              {quote.exchanges.binance && (
                <li>
                  <strong>Binance</strong> · {formatPrice(quote.exchanges.binance.price, 'USD')}
                </li>
              )}
              {quote.exchanges.kraken && (
                <li>
                  <strong>Kraken</strong> · {formatPrice(quote.exchanges.kraken.price, 'USD')}
                </li>
              )}
            </ul>
          </div>
        )}

        {fx?.eurUsd != null && (
          <p className="quote-panel__fx">
            Cambio: 1 € = {formatPrice(fx.eurUsd, 'USD')}
            {fx?.asOf ? ` (${fx.asOf})` : ''}
          </p>
        )}
      </details>

      {hasChange && delta && (
        <div className={`quote-trend quote-trend--${summary.tone}`}>
          <TrendIcon tone={summary.tone} />
          <div>
            <p className="quote-trend__label">{summary.text}</p>
            {quote.change != null && (
              <p className="quote-trend__detail">
                Variazione{isShare ? " sull'azione" : isGram ? ' al grammo' : ''}: {changeSign}
                {delta.eur != null && delta.isGram
                  ? formatPerGram(Math.abs(delta.eur), 'EUR')
                  : delta.eur != null
                    ? formatPrice(Math.abs(delta.eur), 'EUR')
                    : formatPrice(Math.abs(delta.usd), 'USD')}
                {quote.changePercent != null && ` (${formatPercent(quote.changePercent)})`}
              </p>
            )}
          </div>
        </div>
      )}

      {!isHero && quote.asOf && <p className="quote-panel__date">Aggiornato al {quote.asOf}</p>}
    </article>
  );
}
