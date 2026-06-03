import { isCryptoType } from '../marketType.js';
import { getCryptoEntry } from '../cryptoRegistry.js';
import { loadCryptoSpotMarketData } from '../exchanges/cryptoSpot.js';
import {
  tryYahoo,
  tryFcs,
  tryStooq,
  tryAlphaVantage,
} from '../yahooProviders.js';
import { getCategorySourceConfig } from './categorySources.js';
import { toStooqSymbol } from '../stooq.js';
import { fetchStooqHistory } from '../stooq.js';

function scorePayload(payload) {
  if (!payload?.quote?.price) return -1;
  const len = payload.series?.length ?? 0;
  return len * 10 + (payload.quote.price > 0 ? 100 : 0);
}

function attemptRecord(provider, status, payload = null, error = null) {
  return {
    provider,
    ok: status === 'ok',
    status,
    error: error?.message ?? null,
    price: payload?.quote?.price ?? null,
    points: payload?.series?.length ?? 0,
  };
}

async function tryProvider(providerId, displaySymbol, type) {
  if (providerId === 'binance+kraken' && isCryptoType(type)) {
    const entry = getCryptoEntry(displaySymbol);
    if (!entry?.binance) {
      throw new Error('Nessun exchange diretto per questo asset');
    }
    const data = await loadCryptoSpotMarketData(displaySymbol);
    if (!data) throw new Error('Exchange non disponibile');
    return data;
  }
  if (providerId === 'yahoo-finance') {
    return tryYahoo(displaySymbol, type);
  }
  if (providerId === 'fcsapi') {
    const fcs = await tryFcs(displaySymbol, type);
    if (!fcs) throw new Error('FCS non applicabile o senza chiave');
    return fcs;
  }
  if (providerId === 'stooq') {
    const stooqKey = process.env.STOOQ_API_KEY;
    let series = null;
    if (stooqKey && !stooqKey.startsWith('LA_TUA')) {
      try {
        series = await fetchStooqHistory(toStooqSymbol(displaySymbol, type), stooqKey);
      } catch {
        /* latest only */
      }
    }
    return tryStooq(displaySymbol, type, series);
  }
  if (providerId === 'alphavantage') {
    const av = await tryAlphaVantage(displaySymbol, type);
    if (!av) throw new Error('Alpha Vantage non disponibile');
    return av;
  }
  throw new Error(`Provider sconosciuto: ${providerId}`);
}

/**
 * Prova più fonti per categoria; sceglie il risultato migliore e riporta tutti i tentativi.
 */
export async function loadMarketDataMulti(displaySymbol, type) {
  const config = getCategorySourceConfig(type);
  const attempts = [];
  const successes = [];

  const settled = await Promise.allSettled(
    config.providers.map(async (prov) => {
      const payload = await tryProvider(prov.id, displaySymbol, type);
      return { provider: prov.id, payload };
    })
  );

  settled.forEach((result, i) => {
    const prov = config.providers[i];
    if (result.status === 'fulfilled') {
      const { payload } = result.value;
      attempts.push(attemptRecord(prov.id, 'ok', payload));
      successes.push({ provider: prov.id, payload, score: scorePayload(payload) });
    } else {
      attempts.push(attemptRecord(prov.id, 'fail', null, result.reason));
    }
  });

  if (!successes.length) {
    const detail = attempts.map((a) => `${a.provider}: ${a.error || 'no data'}`).join(' · ');
    throw new Error(
      `Nessuna fonte disponibile per ${displaySymbol} (${type}). ${detail}. ` +
        'Verifica chiavi in .env (STOOQ_API_KEY, FCSALE_API_KEY) o riprova.'
    );
  }

  successes.sort((a, b) => b.score - a.score);
  const best = successes[0].payload;
  const alternates = successes.slice(1).map((s) => ({
    provider: s.provider,
    price: s.payload.quote?.price,
    source: s.payload.quote?.source,
    points: s.payload.series?.length ?? 0,
  }));

  return {
    ...best,
    meta: {
      ...best.meta,
      provider: successes[0].provider,
      sources: attempts,
      alternates,
      category: type,
      sourcesConfig: config.providers.map((p) => p.id),
    },
  };
}
