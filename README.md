# SpendWisely 💰

> **Know where your money goes.** A personal expense tracker built for the Ghanaian market, with automatic email parsing, SMS alerts via Arkesel, and a personality-driven notification system.

---

## What is SpendWisely?

SpendWisely is a PWA expense tracker for everyday Ghanaians. It connects to your Gmail to automatically detect transaction emails from MTN MoMo, GCB Bank, Ecobank, Fidelity, Absa, and Stanbic — and logs them without you lifting a finger. When you do spend cash or make MoMo payments not confirmed by email, manual entry takes under 10 seconds.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind v4 |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| Cache | Redis (ioredis) |
| Message Queue | RabbitMQ (amqplib) |
| Email Parsing | Gmail API via Google OAuth 2.0 |
| SMS Notifications | Arkesel Ghana SMS Gateway |
| Animations | Framer Motion |
| Charts | Recharts |
| UI Components | Radix UI + Vaul |

---

## Project Structure

```
spendwisely/
├── apps/
│   ├── web/              ← React PWA frontend
│   └── api/              ← Node.js Express backend
│       └── src/
│           ├── config/   ← Database, Redis, RabbitMQ, Arkesel, env
│           ├── middleware/← Auth, rate limiting, error handling
│           ├── modules/  ← Feature modules (auth, users, expenses, budgets, notifications, email)
│           ├── workers/  ← RabbitMQ consumer workers (separate process)
│           └── engine/   ← Notification logic, email parser, merchant map
├── packages/
│   └── shared/           ← TypeScript types shared between web and api
├── supabase/
│   └── migrations/       ← SQL migration files (run via Supabase CLI)
├── .github/
│   └── workflows/        ← CI/CD pipelines
└── docker-compose.yml    ← Local dev: Redis + RabbitMQ
```

---

## Architecture

```
Browser (PWA)
    │ HTTPS + JWT
    ▼
Express API Server (Node.js)
    │
    ├── PostgreSQL (Supabase)   ← All persistent data
    ├── Redis                   ← Sessions, rate limits, 24h notification gate
    └── RabbitMQ                ← Job queues
             │
             └── Worker Process
                   ├── Email Poller  (Gmail API, 15-min incremental sync)
                   ├── Email Parser  (Ghana bank regex patterns)
                   ├── Pattern Check (8 behavioral notification triggers)
                   ├── Notification  (Arkesel SMS + email dispatch)
                   └── Budget Reset  (Monthly period snapshot + reset)
```

---

## Key Features

- **Automatic email parsing** — Detects MoMo, GCB, Ecobank, Fidelity, Absa alerts
- **Manual entry** — Under 10 seconds: amount → category → save
- **Budget tracking** — Per-category limits with green/amber/red progress
- **Budget history** — Past period snapshots preserved; Insights shows all-time data
- **Payday reset** — Budgets reset on your payday, not the 1st of the month
- **SMS alerts** — Arkesel Ghana SMS for budget warnings and spending patterns
- **Personality** — Funny or Serious notification mode; max 1 joke per day
- **8 behavioral patterns** — Repeat merchant, high ride count, weekend splurge, and more

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop (for Redis + RabbitMQ)
- Supabase account (free tier works)
- Google Cloud Console project (for Gmail OAuth)
- Arkesel account (for SMS)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/spendwisely.git
cd spendwisely
pnpm install
```

### 2. Start Local Services

```bash
docker compose up -d
# Redis → localhost:6379
# RabbitMQ → localhost:5672 | Management UI → localhost:15672
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```
3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
4. Run migrations:
   ```bash
   supabase db push
   ```

### 4. Configure Environment Variables

```bash
cp .env.example apps/api/.env
# Edit apps/api/.env with your Supabase URL, Google OAuth credentials, Arkesel key, etc.
```

Generate required secrets:
```bash
# JWT secrets (run twice for JWT_SECRET and JWT_REFRESH_SECRET)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption key (exactly 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Gmail API** and **Google OAuth 2.0**
3. Create OAuth 2.0 credentials (Web application)
4. Add authorised redirect URI: `http://localhost:3000/api/v1/auth/gmail/callback`
5. Copy Client ID and Client Secret to `.env`

### 6. Run in Development

```bash
# Terminal 1 — API server
pnpm --filter @spendwisely/api dev

# Terminal 2 — Worker process
pnpm --filter @spendwisely/api worker

# Terminal 3 — Frontend
pnpm --filter @spendwisely/web dev
```

---

## API Reference

### Base URL: `http://localhost:3000/api/v1`

All authenticated routes require: `Authorization: Bearer <access_token>`

| Module | Routes |
|--------|--------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/gmail`, `GET /auth/gmail/callback` |
| Users | `GET /users/me`, `PATCH /users/me`, `DELETE /users/me` |
| Expenses | `GET /expenses`, `POST /expenses`, `GET /expenses/:id`, `PATCH /expenses/:id`, `DELETE /expenses/:id`, `GET /expenses/merchants`, `GET /expenses/export/csv`, `GET /expenses/stats/summary` |
| Budgets | `GET /budgets`, `POST /budgets`, `GET /budgets/overview`, `DELETE /budgets/:id` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/:id/dismiss` |
| Email | `GET /email/accounts`, `DELETE /email/accounts/:id`, `POST /email/scan`, `GET /email/pending`, `POST /email/pending/:id/confirm`, `POST /email/pending/:id/reject` |

---

## Database Migrations

All migrations live in `supabase/migrations/`. Run them with:

```bash
supabase db push        # Push all pending migrations to remote
supabase db reset       # Wipe and re-run all migrations (local dev only)
```

### Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | users, expenses, budgets, budget_history, merchant overrides, `get_budgets_with_spent` RPC |
| `002_email_accounts.sql` | email_accounts (OAuth tokens), pending_email_transactions |
| `003_notifications.sql` | notification_history, unread count view, pg_cron setup |

---

## Budget Reset — How It Works

> **Budgets reset on your payday, and full history is always preserved.**

1. During onboarding, you set "When do you get paid?" (e.g., 25th)
2. This sets `user.budget_reset_day = 25` — all budgets default to this
3. Every night at midnight, the `budgetReset.worker.ts` checks if `reset_day === today`
4. If yes, for each matching budget:
   - The current period's spent total is calculated
   - A row is inserted into `budget_history` (snapshot of the period)
   - `budgets.last_reset_at` is updated to `NOW()`
5. **All expenses stay in the DB permanently** — "reset" only shifts the calculation window
6. The Insights tab queries expenses with no date filter → full all-time history always available

---

## Notification System

Three alert types. All dispatched via Arkesel SMS (if phone number set) + saved to DB (always).

| Type | Description | Gate |
|------|-------------|------|
| **Transactional** | Every transaction — factual, immediate | None |
| **Behavioral (Funny/Serious)** | Pattern-based — repeat merchant, weekend splurge, etc. | Max 1 per 24h |
| **Encouraging** | Positive milestones — under budget, months of tracking | On achievement |

**User controls:**
- **Funny / Serious mode** — all humorous copy replaced with factual text in Serious mode
- **Alert Frequency** — All / Budget Only / Weekly Digest / Off

---

## Contributing

1. Branch off `main`: `git checkout -b feature/your-feature`
2. Follow the Controller → Service → Repository pattern
3. Keep functions under 30 lines
4. Run `pnpm typecheck` before pushing
5. Open a PR to `main` — CI must pass before merge

---

## Licence

MIT