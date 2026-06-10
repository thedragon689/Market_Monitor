import { useEffect, useRef, useState } from 'react';

const STREAMS = {
  'BTC-USD': {
    binance: 'wss://stream.binance.com:9443/ws/btcusdt@ticker',
    krakenPair: 'XBT/USD',
  },
  'ETH-USD': {
    binance: 'wss://stream.binance.com:9443/ws/ethusdt@ticker',
    krakenPair: 'ETH/USD',
  },
};

const KRAKEN_WS = 'wss://ws.kraken.com';

/**
 * Stream live Binance + Kraken per BTC-USD / ETH-USD.
 */
export function useCryptoLiveQuote(symbolId, enabled) {
  const [live, setLive] = useState({
    binance: null,
    kraken: null,
    status: 'idle',
  });
  const mounted = useRef(true);
  const prevConfigRef = useRef(null);
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
      prevConfigRef.current = null;
      return undefined;
    }

    const configChanged = prevConfigRef.current !== config;
    prevConfigRef.current = config;
    setLive((s) => {
      if (configChanged) {
        return { binance: null, kraken: null, status: 'connecting' };
      }
      return {
        ...s,
        status: s.binance || s.kraken ? 'live' : 'connecting',
      };
    });
    let binanceWs;
    let krakenWs;

    try {
      binanceWs = new WebSocket(config.binance);
      binanceWs.onmessage = (ev) => {
        if (!mounted.current) return;
        try {
          const m = JSON.parse(ev.data);
          setLive((s) => ({
            ...s,
            status: 'live',
            binance: {
              price: parseFloat(m.c),
              changePercent: parseFloat(m.P),
              source: 'binance',
              asOf: new Date(m.E || Date.now()).toISOString(),
            },
          }));
        } catch {
          /* ignore */
        }
      };
      binanceWs.onerror = () => {
        if (mounted.current) {
          setLive((s) => ({ ...s, status: s.kraken ? 'live' : 'error' }));
        }
      };
    } catch {
      /* no ws */
    }

    try {
      krakenWs = new WebSocket(KRAKEN_WS);
      krakenWs.onopen = () => {
        krakenWs.send(
          JSON.stringify({
            event: 'subscribe',
            pair: [config.krakenPair],
            subscription: { name: 'ticker' },
          })
        );
      };
      krakenWs.onmessage = (ev) => {
        if (!mounted.current) return;
        try {
          const m = JSON.parse(ev.data);
          if (Array.isArray(m) && m[1]?.c) {
            setLive((s) => ({
              ...s,
              status: 'live',
              kraken: {
                price: parseFloat(m[1].c[0]),
                source: 'kraken',
                pair: config.krakenPair,
                asOf: new Date().toISOString(),
              },
            }));
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* no ws */
    }

    return () => {
      binanceWs?.close();
      krakenWs?.close();
    };
  }, [enabled, config]);

  return live;
}

/** @deprecated usa useCryptoLiveQuote */
export function useBtcLiveQuote(enabled) {
  return useCryptoLiveQuote('BTC-USD', enabled);
}
