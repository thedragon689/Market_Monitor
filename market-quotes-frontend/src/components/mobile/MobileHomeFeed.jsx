import Sparkline from '../Sparkline';
import { changeTone, formatChangeBadge, formatCurrentPrice } from '../../utils/catalogPrice';

const INDEX_IDS = ['^GSPC', '^IXIC', '^FTSEMIB', '^GDAXI', '^N225'];
const CRYPTO_IDS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD'];
const PRECIOUS_IDS = ['XAUUSD', 'XAGUSD'];
const COMMODITY_IDS = ['WTI', 'BRENT', 'COPPER'];

const CRYPTO_BRAND = {
  'BTC-USD': { label: 'Bitcoin (BTC)', color: '#f7931a', glyph: '₿' },
  'ETH-USD': { label: 'Ethereum (ETH)', color: '#627eea', glyph: 'Ξ' },
  'SOL-USD': { label: 'Solana (SOL)', color: '#9945ff', glyph: 'S' },
  'BNB-USD': { label: 'BNB (BNB)', color: '#f0b90b', glyph: 'B' },
};

const COMMODITY_BRAND = {
  XAUUSD: { label: 'Oro', color: '#d4a017', glyph: 'Au' },
  XAGUSD: { label: 'Argento', color: '#95a5a6', glyph: 'Ag' },
  WTI: { label: 'Petrolio WTI', color: '#2c3e50', glyph: '⛽' },
  BRENT: { label: 'Petrolio Brent', color: '#34495e', glyph: 'Br' },
  COPPER: { label: 'Rame', color: '#b87333', glyph: 'Cu' },
};

function pickFeatured(items = [], ids = [], limit = 4) {
  const byId = new Map((items || []).map((i) => [i.id.toUpperCase(), i]));
  const out = [];
  for (const id of ids) {
    const item = byId.get(id.toUpperCase()) ?? byId.get(id);
    if (item) out.push({ ...item, assetType: item.assetType || item.type });
    if (out.length >= limit) return out;
  }
  for (const item of items || []) {
    if (out.some((x) => x.id === item.id)) continue;
    if (item?.quote?.price != null) {
      out.push({ ...item, assetType: item.assetType || item.type });
    }
    if (out.length >= limit) break;
  }
  return out;
}

function sparkPointsFromQuote(quote) {
  if (!quote?.price) return [];
  const price = Number(quote.price);
  const pct = Number(quote.changePercent) || 0;
  return Array.from({ length: 8 }, (_, i) => ({
    price: price * (1 + (pct / 100) * (i / 7 - 0.5)),
  }));
}

function IndexCard({ item, fx, onSelect }) {
  const quote = item.quote;
  const price = formatCurrentPrice(quote, item, fx);
  const chg = formatChangeBadge(quote);
  const tone = changeTone(quote?.changePercent);

  return (
    <button
      type="button"
      className={`mhome-index-card mhome-index-card--${tone}`}
      onClick={() => onSelect?.(item.id, item.assetType || 'index')}
    >
      <span className="mhome-index-card__name">{item.name}</span>
      <span className="mhome-index-card__price">{price.primary}</span>
      {chg != null && (
        <span className={`mhome-index-card__chg mhome-index-card__chg--${tone}`}>{chg}</span>
      )}
      <Sparkline
        className="mhome-index-card__spark"
        points={sparkPointsFromQuote(quote)}
        tone={tone === 'neutral' ? 'auto' : tone}
        width={120}
        height={36}
        filled
      />
    </button>
  );
}

function CryptoRow({ item, fx, onSelect }) {
  const brand = CRYPTO_BRAND[item.id.toUpperCase()] ?? {
    label: `${item.name} (${item.id.split('-')[0]})`,
    color: '#64748b',
    glyph: item.name.charAt(0),
  };
  const quote = item.quote;
  const price = formatCurrentPrice(quote, item, fx);
  const chg = formatChangeBadge(quote);
  const tone = changeTone(quote?.changePercent);

  return (
    <button
      type="button"
      className="mhome-list-row mhome-list-row--crypto"
      onClick={() => onSelect?.(item.id, 'crypto')}
    >
      <span
        className="mhome-list-row__icon"
        style={{ background: brand.color }}
        aria-hidden
      >
        {brand.glyph}
      </span>
      <span className="mhome-list-row__label">{brand.label}</span>
      <span className="mhome-list-row__dots" aria-hidden />
      <span className="mhome-list-row__quote">
        <span className="mhome-list-row__price">{price.primary}</span>
        {chg != null && (
          <span className={`mhome-list-row__chg mhome-list-row__chg--${tone}`}>
            <span className="mhome-list-row__chg-icon" aria-hidden>
              {tone === 'up' ? '✓' : tone === 'down' ? '✓' : '·'}
            </span>
            {chg}
          </span>
        )}
      </span>
    </button>
  );
}

function CommodityRow({ item, fx, onSelect }) {
  const brand = COMMODITY_BRAND[item.id.toUpperCase()] ?? COMMODITY_BRAND[item.id] ?? {
    label: item.name,
    color: '#64748b',
    glyph: item.name.charAt(0),
  };
  const quote = item.quote;
  const price = formatCurrentPrice(quote, item, fx);
  const chg = formatChangeBadge(quote);
  const tone = changeTone(quote?.changePercent);

  return (
    <button
      type="button"
      className="mhome-list-row mhome-list-row--commodity"
      onClick={() =>
        onSelect?.(item.id, item.assetType || (item.id === 'XAUUSD' || item.id === 'XAGUSD' ? 'precious' : 'commodity'))
      }
    >
      <span
        className="mhome-list-row__icon"
        style={{ background: brand.color }}
        aria-hidden
      >
        {brand.glyph}
      </span>
      <span className="mhome-list-row__label">{brand.label}</span>
      <span className="mhome-list-row__quote">
        <span className="mhome-list-row__price">{price.primary}</span>
        {chg != null && (
          <span className={`mhome-list-row__chg mhome-list-row__chg--${tone}`}>{chg}</span>
        )}
      </span>
      <Sparkline
        className="mhome-list-row__spark"
        points={sparkPointsFromQuote(quote)}
        tone={tone === 'neutral' ? 'auto' : tone}
        width={56}
        height={28}
      />
    </button>
  );
}

function SectionSkeleton({ tall = false }) {
  return (
    <div className={`mhome-skeleton${tall ? ' mhome-skeleton--tall' : ''}`} aria-hidden>
      <div className="skeleton skeleton--block" />
    </div>
  );
}

/** Home mobile — Indici carousel, Crypto e Materie prime (mockup). */
export default function MobileHomeFeed({
  catalog,
  fx,
  loading,
  refreshing = false,
  onSelectAsset,
}) {
  const blocking = loading && !catalog;
  const indices = pickFeatured(catalog?.index, INDEX_IDS, 5);
  const cryptos = pickFeatured(catalog?.crypto, CRYPTO_IDS, 4);
  const commodities = [
    ...pickFeatured(catalog?.precious, PRECIOUS_IDS, 2),
    ...pickFeatured(catalog?.commodity, COMMODITY_IDS, 3),
  ].slice(0, 4);

  return (
    <div
      className={`mhome${refreshing ? ' mhome--refreshing' : ''}`}
      aria-busy={blocking}
    >
      <section className="mhome__section">
        <h2 className="mhome__title">Indici Globali</h2>
        {blocking ? (
          <SectionSkeleton />
        ) : (
          <div className="mhome-index-scroll" role="list">
            {indices.map((item) => (
              <IndexCard
                key={item.id}
                item={item}
                fx={fx}
                onSelect={onSelectAsset}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mhome__section">
        <h2 className="mhome__title">Crypto</h2>
        {blocking ? (
          <SectionSkeleton tall />
        ) : (
          <div className="mhome-panel">
            {cryptos.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <div className="mhome-panel__divider" aria-hidden />}
                <CryptoRow item={item} fx={fx} onSelect={onSelectAsset} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mhome__section">
        <h2 className="mhome__title">Materie Prime</h2>
        {blocking ? (
          <SectionSkeleton tall />
        ) : (
          <div className="mhome-panel">
            {commodities.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <div className="mhome-panel__divider" aria-hidden />}
                <CommodityRow item={item} fx={fx} onSelect={onSelectAsset} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
