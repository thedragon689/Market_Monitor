import Watchlist from '../Watchlist';

/** Scheda Preferiti — watchlist a schermo intero. */
export default function MobileFavoritesView({
  symbol,
  type,
  quotesBySymbol,
  fx,
  onSelect,
}) {
  return (
    <div className="mhome-favorites">
      <h2 className="mhome__title mhome-favorites__title">Preferiti</h2>
      <Watchlist
        symbol={symbol}
        type={type}
        onSelect={onSelect}
        quotesBySymbol={quotesBySymbol}
        fx={fx}
      />
    </div>
  );
}
