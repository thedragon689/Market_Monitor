/**
 * GraphQL layer completo (Prompt 5): query, mutation, DataLoader, auth, SSE live quotes.
 */
import { createHandler } from 'graphql-http/lib/use/express';
import { buildSchema } from 'graphql';
import DataLoader from 'dataloader';
import { loadMarketData } from '../yahoo.js';
import { MARKET_TYPES } from '../marketType.js';
import { buildForecastResponse } from '../forecastApi.js';
import { verifyToken } from '../portfolio/auth.js';
import { getDashboardLayout, saveDashboardLayout } from '../userPrefs.js';

function authFromReq(req) {
  const header = req.raw?.headers?.authorization || req.headers?.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(header.slice(7), { type: 'access' });
  } catch {
    return null;
  }
}

function clampInt(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function createQuoteLoader() {
  return new DataLoader(async (keys) => {
    const results = await Promise.all(
      keys.map(async ({ symbol, type }) => {
        try {
          const data = await loadMarketData(symbol, type, { historyDays: 5 });
          const q = data?.quote;
          if (!q?.price) return null;
          return {
            symbol,
            type,
            price: q.price,
            changePercent: q.changePercent ?? null,
            currency: q.currency ?? 'USD',
          };
        } catch {
          return null;
        }
      })
    );
    return results;
  });
}

const schema = buildSchema(`
  type Quote {
    symbol: String!
    type: String!
    price: Float
    changePercent: Float
    currency: String
  }

  type HistoryPoint {
    date: String!
    price: Float!
  }

  type DashboardLayout {
    source: String!
    layout: String!
  }

  type Query {
    quote(symbol: String!, type: String!): Quote
    quotes(symbols: [String!]!, type: String!): [Quote]!
    history(symbol: String!, type: String!, days: Int = 90): [HistoryPoint!]!
    forecast(symbol: String!, type: String!, days: Int = 5, method: String = "ensemble"): String
    dashboardLayout: DashboardLayout
  }

  type Mutation {
    saveDashboardLayout(layout: String!): Boolean!
  }
`);

const rootValue = {
  async quote({ symbol, type }, _args, ctx) {
    const loader = ctx.loaders?.quote;
    const key = { symbol: symbol.toUpperCase(), type: type.toLowerCase() };
    if (loader) return loader.load(key);
    const data = await loadMarketData(symbol, type, { historyDays: 5 });
    const q = data?.quote;
    if (!q?.price) return null;
    return {
      symbol: key.symbol,
      type: key.type,
      price: q.price,
      changePercent: q.changePercent ?? null,
      currency: q.currency ?? 'USD',
    };
  },
  async quotes({ symbols, type }, _args, ctx) {
    const safeType = String(type || 'stock').toLowerCase();
    if (!MARKET_TYPES.includes(safeType)) {
      throw new Error(`Tipo non valido: ${type}`);
    }
    const limited = symbols.slice(0, 12);
    const loader = ctx.loaders?.quote;
    const keys = limited.map((s) => ({ symbol: String(s).toUpperCase(), type: safeType }));
    if (loader) return loader.loadMany(keys);
    return Promise.all(keys.map((k) => rootValue.quote(k, null, ctx)));
  },
  async history({ symbol, type, days }) {
    const safeDays = clampInt(days, 90, 10, 120);
    const data = await loadMarketData(symbol, type, { historyDays: safeDays });
    return (data?.history ?? []).slice(-safeDays).map((p) => ({ date: p.date, price: p.price }));
  },
  async forecast({ symbol, type, days, method }) {
    const data = await loadMarketData(symbol, type, { historyDays: Math.max(30, days * 4) });
    const hist = data?.history ?? [];
    if (hist.length < 10) return JSON.stringify({ error: 'Storico insufficiente' });
    const out = buildForecastResponse(hist, {
      methods: method,
      horizonDays: days,
      windowSize: Math.min(20, hist.length - 1),
    });
    return JSON.stringify(out);
  },
  async dashboardLayout(_args, _ctx, context) {
    if (!context.userId) throw new Error('Autenticazione richiesta');
    const { layout, source } = await getDashboardLayout(context.userId);
    return { source, layout: JSON.stringify(layout) };
  },
  async saveDashboardLayout({ layout }, _args, context) {
    if (!context.userId) throw new Error('Autenticazione richiesta');
    const raw = String(layout || '');
    if (raw.length > 32_000) throw new Error('Layout troppo grande');
    const parsed = JSON.parse(raw);
    await saveDashboardLayout(context.userId, parsed);
    return true;
  },
};

export function mountGraphQL(app) {
  app.all(
    '/graphql',
    createHandler({
      schema,
      rootValue,
      context: (req) => {
        const payload = authFromReq(req);
        return {
          userId: payload?.sub ?? null,
          loaders: { quote: createQuoteLoader() },
        };
      },
    })
  );

  /** SSE subscription-style stream per quote live (affianca GraphQL). */
  app.get('/graphql/stream/quote', async (req, res) => {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    const type = String(req.query.type || 'stock').toLowerCase();
    if (!symbol) return res.status(400).json({ error: 'symbol richiesto' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let active = true;
    req.on('close', () => {
      active = false;
    });

    const push = async () => {
      if (!active) return;
      try {
        const data = await loadMarketData(symbol, type, { historyDays: 2 });
        const q = data?.quote;
        const payload = {
          symbol,
          type,
          price: q?.price ?? null,
          changePercent: q?.changePercent ?? null,
          ts: Date.now(),
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (err) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      }
    };

    await push();
    const id = setInterval(push, 5000);
    const maxMs = Number(process.env.GRAPHQL_SSE_MAX_MS) || 5 * 60_000;
    const killTimer = setTimeout(() => {
      active = false;
      clearInterval(id);
      res.end();
    }, maxMs);

    req.on('close', () => {
      active = false;
      clearInterval(id);
      clearTimeout(killTimer);
    });
  });
}
