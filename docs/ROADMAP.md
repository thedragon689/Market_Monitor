# Roadmap — Market Monitor

Roadmap dei miglioramenti per rendere Market Monitor competitiva con le app fintech moderne (2026).
Ogni voce riporta **priorità**, **stima di effort** e **stato rispetto al codebase attuale**.

Legenda effort: **S** = piccolo (≤1 giorno) · **M** = medio (2–5 giorni) · **L** = grande (1–3 settimane) · **XL** = progetto (mesi/infra).
Legenda stato: 🟢 già presente (da rifinire) · 🟡 parziale · 🔴 da fare.

---

## Come leggere le priorità

- **P0 – Quick win**: alto impatto, basso costo, nessuna infra esterna. Da fare subito.
- **P1 – Alto valore**: impatto forte ma richiede lavoro medio o una dipendenza gestibile.
- **P2 – Strategico**: richiede infrastruttura, servizi a pagamento o refactor architetturale.

---

## Frontend

### P0 — Quick win

| Voce | Effort | Stato | Note |
| --- | --- | --- | --- |
| Skeleton loading al posto degli spinner | S | 🟢 | `DataWidgetSkeleton` + skeleton su intelligence, geopolitica, correlazioni, candele, hero mobile |
| Sparklines nelle card KPI | S | 🟢 | `Sparkline.jsx` già presente; diffondere ovunque |
| WCAG AA (contrasto, focus, ARIA, keyboard nav) | M | 🟢 | `accessibility.css`: skip-link, `:focus-visible`, reduced motion, `sr-only` |
| Dark mode first | M | 🟢 | `ThemeProvider` dark-first + `premium-dark.css` token consolidati |
| Glassmorphism / frosted cards | S | 🟢 | `ui-card--glass` su dashboard/widget e card analytics |
| Bottom navigation mobile + bottom-sheet | M | 🟢 | `MobileNavDrawer`, `BottomNavIcon`, `mobileNav.js` già presenti; aggiungere gesture |
| PWA (offline cache + install) | M | 🟢 | SW stale-while-revalidate, `OfflineBanner`, `InstallPrompt`, push server VAPID |
| WCAG AA (contrasto, focus, ARIA, keyboard nav) | M | 🟢 | `accessibility.css`: skip-link, `:focus-visible`, reduced motion, `sr-only` |

### P1 — Alto valore

| Voce | Effort | Stato | Note |
| --- | --- | --- | --- |
| Candlestick interattivi con volumi (zoom/pan/trendline) | L | 🟢 | OHLC, SMA/EMA/BB, RSI+MACD, Fibonacci, confronto multi-asset, export PNG/SVG/CSV, trendline + H-Line |
| Watchlist avanzata (colonne, filtri, sorting, alert inline) | M | 🟢 | `WatchlistPanel`, colonne drag, fuzzy search, sparkline, export CSV |
| Heatmap correlazioni animata / realtime | M | 🟢 | `MarketCorrelations.jsx` presente; aggiungere animazione/live |
| Virtual scrolling per liste lunghe | M | 🟢 | `VirtualTransactionList` su storico transazioni portfolio |
| Dashboard personalizzabile (griglia drag-and-drop) | L | 🟢 | dnd-kit, resize colonne, sync API layout, animazioni CSS |
| Report PDF esportabili del portfolio | M | 🟢 | `exportPortfolioPdf` — report stampabile con posizioni e storico |
| Ruoli-aware views (trader attivo vs investitore passivo) | M | 🟢 | Preset densità `trader`/`investor` via `data-density` + `useDensityPreset` |
| Economic Calendar (eventi macro con impatto) | M | 🟢 | `/api/economic-calendar` (Forex Factory JSON) + UI in `AnalyticsToolkit` |

### P2 — Strategico

| Voce | Effort | Stato | Note |
| --- | --- | --- | --- |
| Data storytelling (narrazioni interattive) | L | 🔴 | Dipende da backend analytics/NLG |
| Sankey diagram flussi portfolio | M | 🟢 | `PortfolioAllocationSankey` — barra allocazione + legenda |
| Voice-first commands | M | 🟢 | `parseVoiceCommand` + TTS Paola; mapping navigazione/simbolo |
| Order Book simulato (bid/ask crypto) | M | 🟢 | `/api/orderbook` Binance depth + UI live in analytics |
| Social Sentiment Feed (X, Reddit, news) | L | 🟢 | `/api/sentiment/social` Reddit + menzioni ticker |
| Paper Trading Simulator | L | 🟢 | `/api/paper/*` + `PaperTradingPanel` (conto €100k virtuale) |

---

## Backend

### P1 — Alto valore

| Voce | Effort | Stato | Note |
| --- | --- | --- | --- |
| Multi-provider fallback robusto (AlphaVantage/IEX/Polygon) | M | 🟢 | Race multi-fonte + **CoinGecko** (crypto) + **circuit breaker** per provider; stato live su `/api/health/providers` |
| Ensemble forecasting pesato + confidence intervals | M | 🟢 | `method=ensemble`/`all`: media pesata (pesi normalizzati sui modelli disponibili) + bande IC 80%/95% da σ·√h; linea ciano con banda nel grafico |
| Rate limiting avanzato tier-based | S | 🟢 | `lib/rateLimit.js` globale su `/api`: tier anonymous/free/pro, costi per-endpoint, header IETF `RateLimit-*` + `Retry-After`; config via env (`RL_*`) |
| Smart alerts contestuali (spiegazione trigger) | M | 🟢 | `explainTrigger` spiega *perché* scatta l'alert portfolio (distanza soglia, P/L assoluto, movimento prezzo, trend, holding) su tutti i canali; `intelligentAlerts` con `detail`+`suggestion` numerici, resi in UI (`IntelligentAlerts.jsx`) |
| Notifiche multi-canale (Email, push web, Slack) | M | 🟢 | Telegram/WhatsApp/WebPush + **Slack** (webhook per-utente) + **Email** (Resend/Brevo HTTP); dispatcher unificato `buildAlertMessages`, opt-in via `/api/notifications/*`, stato su `/api/notifications/config` |
| Dati fondamentali (EPS, P/E, dividend yield) | M | 🟢 | `/api/fundamentals` Yahoo quoteSummary + fallback Alpha Vantage |
| Backtesting engine (Sharpe, Sortino, max drawdown) | L | 🟢 | `lib/backtest/engine.js` + `/api/backtest` + UI strategie |
| Anomaly detection (mercato/portfolio) | M | 🟢 | `detectPriceAnomalies` in intelligence + `/api/anomalies` |
| WebSocket unificato (tutti gli asset) | L | 🟢 | `/ws` price/portfolio/orderbook + `wsPriceBridge` + `/api/health/ws` |

### P2 — Strategico

| Voce | Effort | Stato | Note |
| --- | --- | --- | --- |
| Redis caching (sostituire cache in-memory) | M | 🟢 | `cacheStore` + mirror su `setCache`, hydrate Redis, `/api/health/redis` |
| GraphQL layer (anti over-fetching) | L | 🟢 | query/mutation, DataLoader, auth JWT, SSE `/graphql/stream/quote` |
| OAuth 2.0 / social login (Google, Apple, GitHub) | M | 🟢 | Google GIS + GitHub popup + Apple Sign In; **Auth0** opzionale con MFA (`lib/auth/auth0.js`, dual-mode con JWT legacy) |
| 2FA/MFA (TOTP o WebAuthn) | M | 🟢 | TOTP setup/enable + WebAuthn passkey (opzionale `@simplewebauthn/server`) |
| JWT refresh token con rotazione | S | 🟢 | Access 15m + refresh 7d, rotazione, client auto-refresh |
| Audit log azioni utente | M | 🟢 | `audit_logs` + `GET /api/auth/audit` + log strutturati |
| Rebalancing automatico suggerito | L | 🟢 | `/api/portfolio/rebalance` equal-weight + UI `PortfolioInsights` |
| Tax-loss harvesting alerts | M | 🟢 | `/api/portfolio/tax-loss` + candidati in portfolio |
| Webhooks (Zapier/Make) | M | 🟢 | `outbound_webhooks` + `POST /api/webhooks` eventi portfolio |

### P2 — Scalabilità & DevOps

| Voce | Effort | Stato | Note |
| --- | --- | --- | --- |
| CI/CD pipeline (test, lint, security scan) | M | 🟢 | GitHub Actions: test, lint, build, `npm audit` |
| Observability (Web Vitals, structured logs) | M | 🟢 | Web Vitals, logger JSON, hook Sentry/Datadog opzionali |
| Docker + Kubernetes | L | 🔴 | Oltre Netlify |
| Microservizi (auth, market, forecast, portfolio) | XL | 🔴 | Refactor architetturale |
| CQRS per portfolio | L | 🔴 | Separare letture/scritture |
| Event sourcing portfolio | XL | 🔴 | Storia immutabile |

---

## Sequenza consigliata (proposta)

1. **Sprint 1 (P0 frontend):** skeleton loading, sparklines diffuse, dark mode consolidata, glassmorphism sistematico, PWA offline+push.
2. **Sprint 2 (P1 mix):** candlestick+volumi, watchlist avanzata, virtual scrolling, rate limiting tier-based, ensemble forecasting con confidence intervals.
3. **Sprint 3 (P1/P2):** report PDF, multi-provider fallback robusto, notifiche multi-canale, JWT refresh token + audit log.
4. **Backlog strategico (P2):** Redis, GraphQL, OAuth/2FA, backtesting engine, dashboard drag-and-drop, poi valutare microservizi/CQRS solo se il carico lo richiede.

> Nota: molte voci "🟢/🟡" indicano che le fondamenta esistono già nel codebase — spesso conviene **rifinire e sistematizzare** l'esistente prima di introdurre nuova infrastruttura.
