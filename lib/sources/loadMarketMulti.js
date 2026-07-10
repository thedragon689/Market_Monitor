import { isCryptoType, isMetalType } from '../marketType.js';
import { alphaVantageConfigured } from '../alphavantage.js';
import { getCryptoEntry } from '../cryptoRegistry.js';
import { loadCryptoSpotMarketData } from '../exchanges/cryptoSpot.js';
import { coinGeckoSupported, loadCoinGeckoMarketData } from '../exchanges/coingecko.js';
import {
  tryYahoo,
  tryFcs,
  tryStooq,
  tryAlphaVantage,
} from '../yahooProviders.js';
import { getCategorySourceConfig } from './categorySources.js';
import { toStooqSymbol, stooqSupported } from '../stooq.js';
import { fetchStooqHistory } from '../stooq.js';
import { canAttempt, recordSuccess, recordFailure, breakerState } from './circuitBreaker.js';

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
    error: error?.message ?? (typeof error === 'string' ? error : null),
    price: payload?.quote?.price ?? null,
    points: payload?.series?.length ?? 0,
  };
}

function providerApplicable(providerId, displaySymbol, type) {
  if (providerId === 'yahoo-finance') return true;
  if (providerId === 'binance+kraken') return isCryptoType(type);
  if (providerId === 'coingecko') return isCryptoType(type) && coinGeckoSupported(displaySymbol);
  if (providerId === 'fcsapi') return isMetalType(type);
  if (providerId === 'stooq') return stooqSupported(displaySymbol, type);
  if (providerId === 'alphavantage') return alphaVantageConfigured(type);
  return false;
}

function skipReason(providerId, displaySymbol, type) {
  if (providerId === 'stooq' && !stooqSupported(displaySymbol, type)) {
    return 'Non supportato per questo asset (usa Yahoo)';
  }
  if (providerId === 'alphavantage' && !alphaVantageConfigured(type)) {
    return 'Chiave API non configurata';
  }
  if (providerId === 'fcsapi' && !isMetalType(type)) {
    return 'Solo metalli e commodities';
  }
  if (providerId === 'binance+kraken' && !isCryptoType(type)) {
    return 'Solo crypto';
  }
  if (providerId === 'coingecko') {
    return isCryptoType(type) ? 'Asset non mappato su CoinGecko' : 'Solo crypto';
  }
  return 'Non applicabile';
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
  if (providerId === 'coingecko') {
    const data = await loadCoinGeckoMarketData(displaySymbol);
    if (!data) throw new Error('CoinGecko non disponibile');
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
    const stooqSymbol = toStooqSymbol(displaySymbol, type);
    if (!stooqSymbol) {
      throw new Error('Ticker Stooq non disponibile');
    }
    const stooqKey = process.env.STOOQ_API_KEY;
    let series = null;
    if (stooqKey && !stooqKey.startsWith('LA_TUA')) {
      try {
        series = await fetchStooqHistory(stooqSymbol, stooqKey);
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
  const applicable = [];
  const toSkip = [];

  for (const prov of config.providers) {
    if (providerApplicable(prov.id, displaySymbol, type)) {
      applicable.push(prov);
    } else {
      toSkip.push(prov);
    }
  }

  for (const prov of toSkip) {
    attempts.push(attemptRecord(prov.id, 'skipped', null, skipReason(prov.id, displaySymbol, type)));
  }

  let toTry = applicable.filter((prov) => canAttempt(prov.id));
  if (!toTry.length) {
    toTry = applicable;
  } else {
    for (const prov of applicable) {
      if (toTry.includes(prov)) continue;
      const st = breakerState(prov.id);
      attempts.push(
        attemptRecord(
          prov.id,
          'skipped',
          null,
          `Circuito aperto — riprova tra ${Math.ceil(st.cooldownRemainingMs / 1000)}s`
        )
      );
    }
  }

  // Sequenziale: evita di martellare tutte le fonti in parallelo (saturazione CPU/rete).
  for (const prov of toTry) {
    try {
      const payload = await tryProvider(prov.id, displaySymbol, type);
      recordSuccess(prov.id);
      attempts.push(attemptRecord(prov.id, 'ok', payload));
      const score = scorePayload(payload);
      successes.push({ provider: prov.id, payload, score });
      if (score > 0) break;
    } catch (err) {
      recordFailure(prov.id, err);
      const msg = err?.message ?? 'errore';
      const friendly =
        msg.includes('status code 404') || msg.includes('404')
          ? 'Ticker non trovato su Stooq'
          : msg;
      attempts.push(attemptRecord(prov.id, 'fail', null, friendly));
    }
  }

  if (!successes.length) {
    const detail = attempts
      .filter((a) => a.status === 'fail')
      .map((a) => `${a.provider}: ${a.error || 'no data'}`)
      .join(' · ');
    throw new Error(
      `Nessuna fonte disponibile per ${displaySymbol} (${type}). ${detail || 'Yahoo non ha risposto'}. ` +
        'Riprova più tardi.'
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
