import { formatShortDate } from '../utils/format';
import { PanelWidgetSkeleton } from './ui/DataWidgetSkeleton';

function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;
  const tone =
    sentiment.label?.includes('positiv')
      ? 'pos'
      : sentiment.label?.includes('negativ')
        ? 'neg'
        : 'neu';
  return (
    <span className={`geo-news__badge geo-news__badge--${tone}`} title={sentiment.label}>
      {sentiment.label}
      {sentiment.normalized != null && (
        <span className="geo-news__score"> ({sentiment.normalized > 0 ? '+' : ''}
          {(sentiment.normalized * 100).toFixed(0)}%)
        </span>
      )}
    </span>
  );
}

export default function GeopoliticalNews({ geo, loading }) {
  const articles = geo?.news ?? geo?.articles ?? geo?.newsMeta?.articles ?? [];

  if (loading && !articles.length) {
    return (
      <PanelWidgetSkeleton
        className="geo-news__loading"
        label="Caricamento notizie ANSA, BBC, Guardian…"
        lines={4}
      />
    );
  }

  if (!articles.length) {
    return (
      <p className="geo-news__empty">
        Nessuna notizia geopolitica disponibile al momento. Riprova tra qualche minuto.
      </p>
    );
  }

  return (
    <div className="geo-news">
      <ul className="geo-news__list">
        {articles.slice(0, 12).map((item, i) => (
          <li key={`${item.sourceId}-${i}`} className="geo-news__item">
            <div className="geo-news__meta">
              <span className="geo-news__source">{item.source}</span>
              {item.pubDate && (
                <time dateTime={item.pubDate}>{formatShortDate(item.pubDate)}</time>
              )}
            </div>
            <p className="geo-news__title">
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </p>
            <div className="geo-news__tags">
              <SentimentBadge sentiment={item.sentiment} />
              {item.event?.primary && (
                <span className="geo-news__event">{item.event.primary.label}</span>
              )}
              {item.sentiment?.sourceWeight > 1.2 && (
                <span className="geo-news__weight">fonte pesata</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
