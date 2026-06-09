import ForecastDisclaimerInfo from './ForecastDisclaimerInfo';

const SOURCES = [
  { name: 'Yahoo Finance', role: 'Azioni, ETF, commodities' },
  { name: 'Stooq', role: 'Fallback storico' },
  { name: 'Binance', role: 'Crypto live (WS)' },
  { name: 'Kraken', role: 'Crypto live (WS)' },
];

export default function TrustFooter() {
  return (
    <footer className="trust-footer" id="trust-footer">
      <div className="trust-footer__grid">
        <section className="trust-footer__block">
          <h3 className="trust-footer__title">Fonti dati</h3>
          <ul className="trust-footer__sources">
            {SOURCES.map((s) => (
              <li key={s.name}>
                <strong>{s.name}</strong>
                <span>{s.role}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="trust-footer__block">
          <h3 className="trust-footer__title">Note legali</h3>
          <p className="trust-footer__legal">
            Le quotazioni e le previsioni sono a scopo informativo. Non costituiscono consulenza
            finanziaria. I modelli ML possono divergere dal mercato reale.
          </p>
          <ForecastDisclaimerInfo label="Disclaimer previsioni" />
        </section>
      </div>
      <p className="trust-footer__copy">Market Monitor · Dati aggregati da fonti pubbliche</p>
    </footer>
  );
}
