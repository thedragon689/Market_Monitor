/**
 * Bridge prezzi live → WebSocket: interroga getCachedMarket per i simboli sottoscritti.
 */
export function startPriceBridge(hub, getCachedMarket, { intervalMs = 5000 } = {}) {
  const lastPrices = new Map();
  let ticking = false;

  const tick = async () => {
    if (ticking) return;
    const symbols = hub.getSubscribedSymbols?.() ?? [];
    if (!symbols.length) return;

    ticking = true;
    try {
      for (const { symbol, type } of symbols) {
        try {
          const key = `${type}:${symbol}`;
          const { quote, series } = await getCachedMarket(symbol, type, { allowStale: true });
          const price = quote?.price ?? series?.[series.length - 1]?.price;
          if (price == null) continue;
          const prev = lastPrices.get(key);
          if (prev === price) continue;
          lastPrices.set(key, price);
          hub.publishPrice(symbol, {
            type,
            price,
            changePercent: quote?.changePercent ?? null,
            currency: quote?.currency ?? null,
            asOf: quote?.asOf ?? null,
          });
        } catch {
          /* skip symbol */
        }
      }
    } finally {
      ticking = false;
    }
  };

  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}
