/**
 * WebSocket unificato (Prompt 7) — canali subscribe:price:{symbol}.
 * Attivo solo sul server Node diretto (non Netlify Functions).
 */
import { WebSocketServer } from 'ws';
import { verifyToken } from './portfolio/auth.js';

const channels = new Map();
/** symbolKey -> { symbol, type } */
const symbolMeta = new Map();

function channelKey(kind, id) {
  return `${kind}:${String(id).toUpperCase()}`;
}

function parsePriceKey(key) {
  return symbolMeta.get(key) || { symbol: key.split(':')[1], type: 'stock' };
}

function subscribe(ws, key) {
  if (!channels.has(key)) channels.set(key, new Set());
  channels.get(key).add(ws);
  ws._subs = ws._subs || new Set();
  ws._subs.add(key);
}

function unsubscribeAll(ws) {
  for (const key of ws._subs || []) {
    channels.get(key)?.delete(ws);
  }
  ws._subs?.clear();
}

export function attachWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  let clientId = 0;

  wss.on('connection', (ws, req) => {
    ws.id = ++clientId;
    ws.isAlive = true;
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const payload = verifyToken(token);
        ws.userId = payload.sub;
      } catch {
        ws.close(4401, 'Token non valido');
        return;
      }
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg.action === 'subscribe' && msg.channel === 'price' && msg.symbol) {
        const key = channelKey('price', msg.symbol);
        symbolMeta.set(key, {
          symbol: String(msg.symbol).toUpperCase(),
          type: String(msg.type || 'stock').toLowerCase(),
        });
        subscribe(ws, key);
        ws.send(JSON.stringify({
          type: 'subscribed',
          channel: 'price',
          symbol: msg.symbol,
          assetType: msg.type || 'stock',
        }));
      }
      if (msg.action === 'subscribe' && msg.channel === 'portfolio' && ws.userId) {
        const key = channelKey('portfolio', ws.userId);
        subscribe(ws, key);
        ws.send(JSON.stringify({ type: 'subscribed', channel: 'portfolio', userId: ws.userId }));
      }
      if (msg.action === 'subscribe' && msg.channel === 'orderbook' && msg.symbol) {
        const key = channelKey('orderbook', msg.symbol);
        subscribe(ws, key);
        ws.send(JSON.stringify({ type: 'subscribed', channel: 'orderbook', symbol: msg.symbol }));
      }
      if (msg.action === 'unsubscribe' && msg.channel === 'price' && msg.symbol) {
        const key = channelKey('price', msg.symbol);
        channels.get(key)?.delete(ws);
        ws._subs?.delete(key);
      }
    });

    ws.on('close', () => unsubscribeAll(ws));
    ws.send(JSON.stringify({ type: 'hello', id: ws.id }));
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));

  return {
    wss,
    publishPrice(symbol, payload) {
      const key = channelKey('price', symbol);
      const subs = channels.get(key);
      if (!subs?.size) return;
      const data = JSON.stringify({ type: 'price', symbol, ...payload, ts: Date.now() });
      for (const ws of subs) {
        if (ws.readyState === 1) ws.send(data);
      }
    },
    publishPortfolio(userId, payload) {
      const key = channelKey('portfolio', userId);
      const subs = channels.get(key);
      if (!subs?.size) return;
      const data = JSON.stringify({ type: 'portfolio', userId, ...payload, ts: Date.now() });
      for (const ws of subs) {
        if (ws.readyState === 1) ws.send(data);
      }
    },
    getSubscribedSymbols() {
      const out = [];
      for (const key of channels.keys()) {
        if (!key.startsWith('price:')) continue;
        if (!channels.get(key)?.size) continue;
        out.push(parsePriceKey(key));
      }
      return out;
    },
    stats() {
      const priceChannels = [...channels.keys()].filter((k) => k.startsWith('price:')).length;
      return { clients: wss.clients.size, channels: channels.size, priceChannels };
    },
    close() {
      clearInterval(heartbeat);
      for (const ws of wss.clients) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      wss.close();
    },
  };
}
