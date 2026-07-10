import { neon } from '@neondatabase/serverless';

let sql = null;
let schemaReady = false;

export function getDb() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!sql) sql = neon(url);
  return sql;
}

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Migrazione idempotente — crea tabelle e colonne mancanti. */
export async function ensureSchema() {
  if (schemaReady) return true;
  const db = getDb();
  if (!db) return false;

  await db`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  await db`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_alerts BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth0_id TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id) WHERE auth0_id IS NOT NULL`;
  await db`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`;

  await db`
    CREATE TABLE IF NOT EXISTS portfolio_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      asset_type TEXT NOT NULL DEFAULT 'stock',
      quantity NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      avg_price NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (avg_price >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, symbol)
    )
  `;
  await db`ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS alert_gain NUMERIC(10, 4)`;
  await db`ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS alert_loss NUMERIC(10, 4)`;
  await db`ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS last_gain_alert_at TIMESTAMPTZ`;
  await db`ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS last_loss_alert_at TIMESTAMPTZ`;

  await db`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id UUID NOT NULL REFERENCES portfolio_assets(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
      quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
      price NUMERIC(20, 8) NOT NULL CHECK (price > 0),
      date TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS portfolio_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      total_value NUMERIC(20, 4) NOT NULL,
      total_pl NUMERIC(20, 4)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, endpoint)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`;
  await db`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS lookup_key TEXT`;
  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_lookup
    ON refresh_tokens(lookup_key)
    WHERE lookup_key IS NOT NULL
  `;

  await db`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verification_tokens(user_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      meta JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC)`;

  await db`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      dashboard_layout JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      profile JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (provider, provider_user_id)
    )
  `;

  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_gain BOOLEAN NOT NULL DEFAULT TRUE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_loss BOOLEAN NOT NULL DEFAULT TRUE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_forecast BOOLEAN NOT NULL DEFAULT TRUE`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_advice BOOLEAN NOT NULL DEFAULT TRUE`;

  await db`ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS last_forecast_alert_at TIMESTAMPTZ`;
  await db`ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS last_advice_alert_at TIMESTAMPTZ`;
  await db`ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS last_advice_action TEXT`;

  await db`
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      counter BIGINT NOT NULL DEFAULT 0,
      device_type TEXT,
      backed_up BOOLEAN,
      transports TEXT[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials(user_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS outbound_webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      events JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, url)
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS paper_accounts (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      cash NUMERIC(20, 4) NOT NULL DEFAULT 100000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS paper_positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      asset_type TEXT NOT NULL DEFAULT 'stock',
      quantity NUMERIC(20, 8) NOT NULL,
      avg_price NUMERIC(20, 8) NOT NULL,
      UNIQUE (user_id, symbol)
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS paper_trades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
      quantity NUMERIC(20, 8) NOT NULL,
      price NUMERIC(20, 8) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_paper_trades_user ON paper_trades(user_id, created_at DESC)`;

  await db`CREATE INDEX IF NOT EXISTS idx_portfolio_assets_user ON portfolio_assets(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_portfolio_history_user_date ON portfolio_history(user_id, date DESC)`;

  schemaReady = true;
  return true;
}
