import StatCard from './StatCard';
import { formatPercent, formatPrice } from '../utils/format';
import { buildDisplayPricing } from '../utils/pricing';
import { getSymbolMeta } from '../data/symbols';

function fmtVolume(v) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  const n = Number(v);
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('it-IT');
}

function fmtMarketCap(v) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  const n = Number(v);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function AssetStatsRow({
  quote,
  analysis,
  loading,
  refreshing = false,
  type,
  symbol,
  fx,
}) {
  const meta = getSymbolMeta(symbol, type);
  const display = quote?.price ? buildDisplayPricing(meta, quote, fx) : null;
  const mainPrice =
    display?.primaryEur != null
      ? formatPrice(display.primaryEur, 'EUR')
      : display?.primaryUsd != null
        ? formatPrice(display.primaryUsd, 'USD')
        : null;

  const pct = quote?.changePercent != null ? Number(quote.changePercent) : null;
  const tone = pct == null ? 'neutral' : pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
  const atr = analysis?.indicators?.atr14;
  const volPct =
    atr != null && quote?.price
      ? `${((Number(atr.value ?? atr) / Number(quote.price)) * 100).toFixed(2)}%`
      : analysis?.indicators?.atr14?.pctOfPrice != null
        ? `${Number(analysis.indicators.atr14.pctOfPrice).toFixed(2)}%`
        : null;

  const marketCap = quote?.marketCap ?? analysis?.yahooQuote?.marketCap ?? null;

  const ccy = (quote?.currency || 'USD').toUpperCase();
  const dayLowFmt =
    quote?.dayLow != null ? formatPrice(quote.dayLow, ccy) : null;
  const dayHighFmt =
    quote?.dayHigh != null ? formatPrice(quote.dayHigh, ccy) : null;
  const yearLowFmt =
    quote?.fiftyTwoWeekLow != null ? formatPrice(quote.fiftyTwoWeekLow, ccy) : null;
  const yearHighFmt =
    quote?.fiftyTwoWeekHigh != null ? formatPrice(quote.fiftyTwoWeekHigh, ccy) : null;

  const hasQuote = Boolean(quote?.price && !quote?.error);
  const quoteLoad = loading && !hasQuote;
  const analysisLoad = loading && !analysis?.indicators;

  return (
    <div className="asset-stats" aria-label="Statistiche asset">
      <StatCard label="Prezzo" value={mainPrice ?? '—'} loading={quoteLoad} refreshing={refreshing} />
      <StatCard
        label="Variazione"
        value={pct != null ? formatPercent(pct) : '—'}
        tone={tone}
        loading={quoteLoad}
        refreshing={refreshing}
      />
      <StatCard
        label="Volume"
        value={fmtVolume(quote?.volume) ?? '—'}
        sub={quote?.volume == null ? 'Non disponibile' : undefined}
        loading={quoteLoad}
        refreshing={refreshing}
      />
      {marketCap != null ? (
        <StatCard
          label="Market cap"
          value={fmtMarketCap(marketCap)}
          loading={quoteLoad}
          refreshing={refreshing}
        />
      ) : dayLowFmt && dayHighFmt ? (
        <StatCard
          label="Range giorno"
          value={dayLowFmt}
          sub={`↑ ${dayHighFmt}`}
          loading={quoteLoad}
          refreshing={refreshing}
        />
      ) : yearLowFmt && yearHighFmt ? (
        <StatCard
          label="Range 52 sett."
          value={yearLowFmt}
          sub={`↑ ${yearHighFmt}`}
          loading={quoteLoad}
          refreshing={refreshing}
        />
      ) : (
        <StatCard
          label="Range giorno"
          value="—"
          sub="Non disponibile"
          loading={quoteLoad}
          refreshing={refreshing}
        />
      )}
      <StatCard
        label="Volatilità"
        value={volPct ?? '—'}
        sub={atr != null ? `ATR ${Number(atr.value ?? atr).toFixed(2)}` : undefined}
        loading={analysisLoad}
        refreshing={refreshing && !analysisLoad}
      />
    </div>
  );
}
