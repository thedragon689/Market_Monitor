import { getDb } from '../db.js';

const STARTING_CASH = 100_000;

export async function getPaperAccount(userId) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');
  const rows = await db`
    SELECT cash, created_at FROM paper_accounts WHERE user_id = ${userId} LIMIT 1
  `;
  if (!rows[0]) {
    await db`INSERT INTO paper_accounts (user_id, cash) VALUES (${userId}, ${STARTING_CASH})`;
    return { cash: STARTING_CASH, positions: [] };
  }
  const positions = await db`
    SELECT symbol, asset_type, quantity, avg_price FROM paper_positions WHERE user_id = ${userId}
  `;
  return {
    cash: Number(rows[0].cash),
    positions: positions.map((p) => ({
      symbol: p.symbol,
      assetType: p.asset_type,
      quantity: Number(p.quantity),
      avgPrice: Number(p.avg_price),
    })),
  };
}

export async function paperTrade(userId, { symbol, assetType, side, quantity, price }, deps) {
  const db = getDb();
  if (!db) throw new Error('Database non configurato');
  const sym = String(symbol).toUpperCase();
  const qty = Number(quantity);
  const px = Number(price);
  if (!sym || !['buy', 'sell'].includes(side) || !(qty > 0) || !(px > 0)) {
    throw new Error('Parametri trade non validi');
  }

  const account = await getPaperAccount(userId);
  const cost = qty * px;

  if (side === 'buy' && account.cash < cost) {
    throw new Error('Cash insufficiente nel paper account');
  }

  const existing = account.positions.find((p) => p.symbol === sym);
  if (side === 'sell') {
    if (!existing || existing.quantity < qty) throw new Error('Quantità insufficiente');
    const newQty = existing.quantity - qty;
    if (newQty <= 0) {
      await db`DELETE FROM paper_positions WHERE user_id = ${userId} AND symbol = ${sym}`;
    } else {
      await db`UPDATE paper_positions SET quantity = ${newQty} WHERE user_id = ${userId} AND symbol = ${sym}`;
    }
    await db`UPDATE paper_accounts SET cash = cash + ${cost} WHERE user_id = ${userId}`;
  } else {
    if (existing) {
      const newQty = existing.quantity + qty;
      const newAvg = (existing.quantity * existing.avgPrice + cost) / newQty;
      await db`
        UPDATE paper_positions SET quantity = ${newQty}, avg_price = ${newAvg}
        WHERE user_id = ${userId} AND symbol = ${sym}
      `;
    } else {
      await db`
        INSERT INTO paper_positions (user_id, symbol, asset_type, quantity, avg_price)
        VALUES (${userId}, ${sym}, ${assetType || 'stock'}, ${qty}, ${px})
      `;
    }
    await db`UPDATE paper_accounts SET cash = cash - ${cost} WHERE user_id = ${userId}`;
  }

  await db`
    INSERT INTO paper_trades (user_id, symbol, asset_type, side, quantity, price)
    VALUES (${userId}, ${sym}, ${assetType || 'stock'}, ${side}, ${qty}, ${px})
  `;

  const updated = await getPaperAccount(userId);
  if (deps?.getCachedMarket) {
    for (const p of updated.positions) {
      try {
        const { quote } = await deps.getCachedMarket(p.symbol, p.assetType);
        p.currentPrice = quote?.price ?? null;
        p.currentValue = p.currentPrice ? p.currentPrice * p.quantity : null;
        p.pl = p.currentPrice ? (p.currentPrice - p.avgPrice) * p.quantity : null;
      } catch {
        /* skip */
      }
    }
  }
  return updated;
}

export async function getPaperTrades(userId, limit = 50) {
  const db = getDb();
  if (!db) return [];
  const rows = await db`
    SELECT symbol, asset_type, side, quantity, price, created_at
    FROM paper_trades WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({
    symbol: r.symbol,
    assetType: r.asset_type,
    side: r.side,
    quantity: Number(r.quantity),
    price: Number(r.price),
    createdAt: r.created_at,
  }));
}
