import { formatShortDate } from '../../utils/format';

export default function TerminalNewsFeed({ articles = [], loading }) {
  if (loading && !articles.length) {
    return (
      <div className="terminal-news terminal-news--loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton--line" />
        ))}
      </div>
    );
  }

  if (!articles.length) {
    return <p className="terminal-news__empty">Nessuna notizia al momento.</p>;
  }

  return (
    <ul className="terminal-news">
      {articles.slice(0, 8).map((item, i) => (
        <li key={`${item.sourceId ?? item.source}-${i}`} className="terminal-news__item">
          <div className="terminal-news__meta">
            <span className="terminal-news__source">{item.source}</span>
            {item.pubDate && (
              <time dateTime={item.pubDate}>{formatShortDate(item.pubDate)}</time>
            )}
          </div>
          <p className="terminal-news__title">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            ) : (
              item.title
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
