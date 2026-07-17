-- Portfolio Finanziario avanzato — schema NeonDB (PostgreSQL)
-- Esegui con: npm run db:migrate

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  auth0_id TEXT UNIQUE,
  mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_chat_id TEXT,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'stock',
  quantity NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  avg_price NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (avg_price >= 0),
  alert_gain NUMERIC(10, 4),
  alert_loss NUMERIC(10, 4),
  last_gain_alert_at TIMESTAMPTZ,
  last_loss_alert_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES portfolio_assets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  price NUMERIC(20, 8) NOT NULL CHECK (price > 0),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_value NUMERIC(20, 4) NOT NULL,
  total_pl NUMERIC(20, 4)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_assets_user ON portfolio_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_history_user_date ON portfolio_history(user_id, date DESC);

ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS last_value NUMERIC(20, 4);
ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS last_pl_percent NUMERIC(12, 6);
ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS value_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS portfolio_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES portfolio_assets(id) ON DELETE SET NULL,
  symbol TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('asset', 'portfolio')),
  direction TEXT NOT NULL CHECK (direction IN ('increase', 'decrease', 'unchanged')),
  previous_value NUMERIC(20, 4),
  current_value NUMERIC(20, 4) NOT NULL,
  delta_value NUMERIC(20, 4) NOT NULL DEFAULT 0,
  delta_percent NUMERIC(12, 6),
  previous_pl_percent NUMERIC(12, 6),
  current_pl_percent NUMERIC(12, 6),
  importance NUMERIC(20, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES portfolio_assets(id) ON DELETE SET NULL,
  variation_id UUID REFERENCES portfolio_variations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  symbol TEXT,
  title TEXT NOT NULL,
  body TEXT,
  importance NUMERIC(20, 6) NOT NULL DEFAULT 0,
  direction TEXT CHECK (direction IN ('increase', 'decrease', 'neutral')),
  payload JSONB NOT NULL DEFAULT '{}',
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_variations_user_time ON portfolio_variations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_variations_user_importance ON portfolio_variations(user_id, importance DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_user_time ON notification_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_user_importance ON notification_events(user_id, importance DESC);

CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code ON telegram_link_codes(code);
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_user ON telegram_link_codes(user_id);
