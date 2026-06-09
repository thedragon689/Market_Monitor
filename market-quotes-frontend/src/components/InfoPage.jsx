import ForecastDisclaimerInfo from './ForecastDisclaimerInfo';
import DataSources from './DataSources';

const SOURCES = [
  { name: 'Yahoo Finance', desc: 'Quotazioni, storici e metadati per azioni, ETF, indici e commodities.' },
  { name: 'Stooq', desc: 'Fallback per quotazioni e serie storiche quando Yahoo non risponde.' },
  { name: 'Binance / Kraken', desc: 'Stream WebSocket per prezzi crypto live (BTC, ETH).' },
  { name: 'FCS API', desc: 'Metalli preziosi e commodities (se configurata).' },
];

export default function InfoPage({ type, marketMeta, categoryConfig }) {
  return (
    <div className="info-page view-panel">
      <header className="info-page__hero app-card">
        <h1 className="info-page__title">Info &amp; note legali</h1>
        <p className="info-page__lead">
          Market Monitor aggrega dati da fonti pubbliche a scopo informativo. Nessun contenuto
          costituisce consulenza finanziaria o invito all&apos;investimento.
        </p>
      </header>

      <section className="info-page__grid">
        <article className="info-page__card app-card">
          <h2>Disclaimer informativo</h2>
          <p>
            Le quotazioni possono essere ritardate, stimate o provenire da proxy. Verifica sempre
            le fonti ufficiali prima di decisioni operative. L&apos;app non esegue ordini né
            gestisce portafogli.
          </p>
        </article>

        <article className="info-page__card app-card">
          <h2>Modelli previsionali</h2>
          <p>
            ARIMA, LSTM, Prophet, regressione e modelli ibridi sono strumenti statistici: non
            garantiscono performance future. Usa le previsioni come scenario di lavoro, non come
            raccomandazione.
          </p>
          <ForecastDisclaimerInfo label="Dettaglio disclaimer previsioni" />
        </article>

        <article className="info-page__card app-card info-page__card--wide">
          <h2>Fonti dati</h2>
          <ul className="info-page__sources">
            {SOURCES.map((s) => (
              <li key={s.name}>
                <strong>{s.name}</strong>
                <span>{s.desc}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="info-page__tech app-card">
        <h2>Trasparenza tecnica</h2>
        <DataSources
          type={type}
          provider={marketMeta?.provider}
          sources={marketMeta?.sources}
          alternates={marketMeta?.alternates}
          categoryConfig={categoryConfig}
        />
      </section>

      <p className="info-page__copy">
        © Market Monitor · Dati aggregati · Deploy Netlify · Versione API 1.2
      </p>
    </div>
  );
}
