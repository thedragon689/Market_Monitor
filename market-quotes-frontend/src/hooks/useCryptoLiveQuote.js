import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../config/api';
import { apiFetch } from '../utils/apiFetch';

/** Porta 443: meno blocchi firewall rispetto a :9443. */
const STREAMS = {
  'BTC-USD': {
    binance: 'wss://stream.binance.com/ws/btcusdt@ticker',
    krakenPair: 'XBT/USD',
    marketSymbol: 'BTC-USD',
  },
  'ETH-USD': {
    binance: 'wss://stream.binance.com/ws/ethusdt@ticker',
    krakenPair: 'ETH/USD',
    marketSymbol: 'ETH-USD',
  },
};

const KRAKEN_WS = 'wss://ws.kraken.com';
const CONNECT_DELAY_MS = 250;
const WS_CONNECT_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 12_000;

function closeSocket(ws) {
  if (!ws) return;
  try {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'cleanup');
    }
  } catch {
    /* ignore */
  }
}

function applyExchangeQuote(setLive, source, payload) {
  setLive((s) => ({
    ...s,
    status: s.status === 'polling' ? 'polling' : 'live',
    [source]: payload,
  }));
}

async function fetchMarketSnapshot(symbolId) {
  const { data } = await apiFetch(
    `${API_BASE}/api/market?symbol=${encodeURIComponent(symbolId)}&type=crypto&limit=2`,
    { optional: true }
  );
  if (!data?.quote) return null;

  const binance = data.quote.exchanges?.binance;
  const kraken = data.quote.exchanges?.kraken;

  return {
    binance: binance?.price
      ? {
          price: Number(binance.price),
          changePercent: binance.changePercent != null ? Number(binance.changePercent) : null,
          source: 'binance',
          asOf: data.quote.asOf ?? new Date().toISOString(),
          via: 'rest',
        }
      : null,
    kraken: kraken?.price
      ? {
          price: Number(kraken.price),
          source: 'kraken',
          pair: kraken.pair,
          asOf: data.quote.asOf ?? new Date().toISOString(),
          via: 'rest',
        }
      : null,
  };
}

/**
 * Stream live Binance + Kraken per BTC-USD / ETH-USD.
 * Fallback REST (proxy server) se WebSocket non disponibile (firewall, geo, StrictMode).
 */
export function useCryptoLiveQuote(symbolId, enabled) {
  const [live, setLive] = useState({
    binance: null,
    kraken: null,
    status: 'idle',
  });
  const mounted = useRef(true);
  const config = STREAMS[symbolId?.toUpperCase()];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !config) {
      setLive({ binance: null, kraken: null, status: 'idle' });
      return undefined;
    }

    let generation = 0;
    let binanceWs;
    let krakenWs;
    let connectTimer;
    let pollTimer;
    let wsTimeout;
    let binanceFailed = false;
    let krakenFailed = false;
    let hasWsData = false;

    const syncStatus = () => {
      if (!mounted.current) return;
      setLive((s) => {
        if (s.binance || s.kraken) {
          return { ...s, status: s.status === 'polling' ? 'polling' : 'live' };
        }
        if (binanceFailed && krakenFailed) return { ...s, status: 'polling' };
        return { ...s, status: 'connecting' };
      });
    };

    const startPolling = () => {
      if (pollTimer) return;

      const poll = async () => {
        if (!mounted.current) return;
        try {
          const snap = await fetchMarketSnapshot(config.marketSymbol);
          if (!mounted.current || !snap) return;
          setLive((s) => ({
            binance: snap.binance ?? s.binance,
            kraken: snap.kraken ?? s.kraken,
            status: 'polling',
          }));
        } catch {
          /* server non raggiungibile */
        }
      };

      poll();
      pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    };

    const maybeFallback = () => {
      if (!mounted.current) return;
      if (hasWsData) return;
      if (binanceFailed && krakenFailed) startPolling();
    };

    const connect = () => {
      if (!mounted.current) return;
      generation += 1;
      const gen = generation;

      closeSocket(binanceWs);
      closeSocket(krakenWs);
      binanceWs = null;
      krakenWs = null;
      binanceFailed = false;
      krakenFailed = false;
      hasWsData = false;

      setLive({ binance: null, kraken: null, status: 'connecting' });

      wsTimeout = setTimeout(() => {
        if (!mounted.current || gen !== generation) return;
        if (!hasWsData) {
          binanceFailed = true;
          krakenFailed = true;
          maybeFallback();
        }
      }, WS_CONNECT_TIMEOUT_MS);

      try {
        binanceWs = new WebSocket(config.binance);
        binanceWs.onopen = () => {
          if (gen !== generation) closeSocket(binanceWs);
        };
        binanceWs.onmessage = (ev) => {
          if (!mounted.current || gen !== generation) return;
          try {
            const m = JSON.parse(ev.data);
            hasWsData = true;
            applyExchangeQuote(setLive, 'binance', {
              price: parseFloat(m.c),
              changePercent: parseFloat(m.P),
              source: 'binance',
              asOf: new Date(m.E || Date.now()).toISOString(),
              via: 'ws',
            });
          } catch {
            /* ignore */
          }
        };
        binanceWs.onerror = () => {
          if (gen !== generation) return;
          binanceFailed = true;
          syncStatus();
          maybeFallback();
        };
        binanceWs.onclose = (ev) => {
          if (gen !== generation || ev.code === 1000) return;
          binanceFailed = true;
          maybeFallback();
        };
      } catch {
        binanceFailed = true;
      }

      try {
        krakenWs = new WebSocket(KRAKEN_WS);
        krakenWs.onopen = () => {
          if (gen !== generation) {
            closeSocket(krakenWs);
            return;
          }
          krakenWs.send(
            JSON.stringify({
              event: 'subscribe',
              pair: [config.krakenPair],
              subscription: { name: 'ticker' },
            })
          );
        };
        krakenWs.onmessage = (ev) => {
          if (!mounted.current || gen !== generation) return;
          try {
            const m = JSON.parse(ev.data);
            if (Array.isArray(m) && m[1]?.c) {
              hasWsData = true;
              applyExchangeQuote(setLive, 'kraken', {
                price: parseFloat(m[1].c[0]),
                source: 'kraken',
                pair: config.krakenPair,
                asOf: new Date().toISOString(),
                via: 'ws',
              });
            }
          } catch {
            /* ignore */
          }
        };
        krakenWs.onerror = () => {
          if (gen !== generation) return;
          krakenFailed = true;
          syncStatus();
          maybeFallback();
        };
        krakenWs.onclose = (ev) => {
          if (gen !== generation || ev.code === 1000) return;
          krakenFailed = true;
          maybeFallback();
        };
      } catch {
        krakenFailed = true;
      }

      maybeFallback();
    };

    connectTimer = setTimeout(connect, CONNECT_DELAY_MS);

    return () => {
      generation += 1;
      clearTimeout(connectTimer);
      clearTimeout(wsTimeout);
      if (pollTimer) clearInterval(pollTimer);
      closeSocket(binanceWs);
      closeSocket(krakenWs);
    };
  }, [enabled, config]);

  return live;
}
