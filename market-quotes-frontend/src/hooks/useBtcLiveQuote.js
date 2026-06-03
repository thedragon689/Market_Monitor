import { useEffect, useRef, useState } from 'react';

const BINANCE_WS = 'wss://stream.binance.com:9443/ws/btcusdt@ticker';
const KRAKEN_WS = 'wss://ws.kraken.com';

/**
 * Stream live BTC da Binance (@ticker) e Kraken (ticker XBT/USD).
 * Attivo solo quando enabled=true (es. asset BTC-USD in analisi).
 */
export function useBtcLiveQuote(enabled) {
  const [live, setLive] = useState({
    binance: null,
    kraken: null,
    status: 'idle',
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLive({ binance: null, kraken: null, status: 'idle' });
      return undefined;
    }

    setLive((s) => ({ ...s, status: 'connecting' }));
    let binanceWs;
    let krakenWs;
    let krakenReady = false;

    try {
      binanceWs = new WebSocket(BINANCE_WS);
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
              symbol: 'BTCUSDT',
              asOf: new Date(m.E || Date.now()).toISOString(),
            },
          }));
        } catch {
          /* ignore malformed frame */
        }
      };
      binanceWs.onerror = () => {
        if (mounted.current) setLive((s) => ({ ...s, status: s.kraken ? 'live' : 'error' }));
      };
    } catch {
      /* WebSocket non disponibile */
    }

    try {
      krakenWs = new WebSocket(KRAKEN_WS);
      krakenWs.onopen = () => {
        krakenReady = true;
        krakenWs.send(
          JSON.stringify({
            event: 'subscribe',
            pair: ['XBT/USD'],
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
                pair: 'XBT/USD',
                asOf: new Date().toISOString(),
              },
            }));
          }
        } catch {
          /* ignore */
        }
      };
      krakenWs.onerror = () => {
        if (mounted.current && !krakenReady) {
          setLive((s) => ({ ...s, status: s.binance ? 'live' : 'error' }));
        }
      };
    } catch {
      /* WebSocket non disponibile */
    }

    return () => {
      binanceWs?.close();
      krakenWs?.close();
    };
  }, [enabled]);

  return live;
}
