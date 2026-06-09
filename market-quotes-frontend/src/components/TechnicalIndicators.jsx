import { getSymbolMeta } from '../data/symbols';
import ForecastPrice from './ForecastPrice';
import { formatPrice } from '../utils/format';

function IndicatorRow({ label, children }) {
  return (
    <div className="indicator-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function formatNum(value, digits = 2) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function TechnicalIndicators({
  analysis,
  loading,
  fx,
  type,
  symbol,
  visible = { ema: true, rsi: true, macd: true, bollinger: true },
}) {
  const meta = getSymbolMeta(symbol, type);
  const ind = analysis?.indicators;

  if (loading && !ind) {
    return (
      <div className="indicators-panel indicators-panel--loading">
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line" />
      </div>
    );
  }

  if (!ind) {
    return (
      <p className="indicators-panel__empty">
        Aggiorna i dati per vedere SMA, EMA, RSI, MACD e Bande di Bollinger.
      </p>
    );
  }

  const macd = ind.macd;
  const bb = ind.bollinger;
  const rsiTone =
    ind.rsi14 == null ? '' : ind.rsi14 >= 70 ? ' overbought' : ind.rsi14 <= 30 ? ' oversold' : '';

  return (
    <div className="indicators-panel">
      <dl className="indicators-grid">
        {visible.ema !== false && (
          <>
            <IndicatorRow label={`SMA (14)`}>{formatNum(ind.sma14)}</IndicatorRow>
            <IndicatorRow label={`SMA (20)`}>{formatNum(ind.sma20)}</IndicatorRow>
            <IndicatorRow label={`EMA (14)`}>{formatNum(ind.ema14)}</IndicatorRow>
            <IndicatorRow label={`EMA (20)`}>{formatNum(ind.ema20)}</IndicatorRow>
          </>
        )}
        {visible.rsi !== false && (
          <IndicatorRow label={`RSI (14)`}>
            <span className={`indicator-rsi${rsiTone}`}>{formatNum(ind.rsi14)}</span>
          </IndicatorRow>
        )}
        {visible.macd !== false && (
          <IndicatorRow label="MACD">
            {macd ? (
              <>
                linea {formatNum(macd.macdLine, 4)}, signal {formatNum(macd.signal, 4)}, hist{' '}
                {formatNum(macd.histogram, 4)}
              </>
            ) : (
              '—'
            )}
          </IndicatorRow>
        )}
        {visible.bollinger !== false && (
          <IndicatorRow label="Bollinger (20)">
            {bb ? (
              <>
                sup. {formatNum(bb.upper)} · media {formatNum(bb.middle)} · inf.{' '}
                {formatNum(bb.lower)}
              </>
            ) : (
              '—'
            )}
          </IndicatorRow>
        )}
        {ind.cci20 != null && (
          <IndicatorRow label="CCI (20)">{formatNum(ind.cci20, 1)}</IndicatorRow>
        )}
        {ind.williamsR14 != null && (
          <IndicatorRow label="Williams %R">{formatNum(ind.williamsR14, 1)}</IndicatorRow>
        )}
        {ind.atr14 != null && (
          <IndicatorRow label="ATR (14)">
            {formatNum(ind.atr14.value, 4)}
            {ind.atr14.pctOfPrice != null && ` (${formatNum(ind.atr14.pctOfPrice, 2)}%)`}
          </IndicatorRow>
        )}
        {ind.momentum14 != null && (
          <IndicatorRow label="Momentum (14)">{formatNum(ind.momentum14, 2)}%</IndicatorRow>
        )}
      </dl>

      {analysis?.forecast?.logReturn?.nextPrice != null && (
        <p className="indicators-panel__hint">
          Previsione log-return (1 giorno):{' '}
          <ForecastPrice usd={analysis.forecast.logReturn.nextPrice} fx={fx} meta={meta} as="span" />
          {analysis.forecast.logReturn.avgLogReturn != null && (
            <span className="indicators-panel__muted">
              {' '}
              (r̄ = {(analysis.forecast.logReturn.avgLogReturn * 100).toFixed(3)}%)
            </span>
          )}
        </p>
      )}

      {analysis?.yahooQuote?.price != null && (
        <p className="indicators-panel__source">
          Quote Yahoo v7: {formatPrice(analysis.yahooQuote.price, analysis.yahooQuote.currency || 'USD')}
        </p>
      )}
    </div>
  );
}
