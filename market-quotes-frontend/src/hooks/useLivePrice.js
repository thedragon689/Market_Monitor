import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../config/api';
import { getPortfolioToken } from '../utils/portfolioApi';

/**
 * Hook WebSocket prezzi live — subscribe:price con auth JWT opzionale.
 */
export default function useLivePrice(symbol, type = 'stock', enabled = true) {
  const [quote, setQuote] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    if (!enabled || !symbol) return undefined;
    const token = getPortfolioToken();
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = API_BASE ? new URL(API_BASE).host : window.location.host;
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    const ws = new WebSocket(`${proto}://${host}/ws${qs}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          action: 'subscribe',
          channel: 'price',
          symbol: symbol.toUpperCase(),
          type,
        })
      );
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'price' && msg.symbol?.toUpperCase() === symbol.toUpperCase()) {
          setQuote(msg);
        }
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled, symbol, type]);

  useEffect(() => connect(), [connect]);

  return { quote, connected };
}
