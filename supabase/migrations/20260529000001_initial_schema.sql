-- ============================================================
-- Migration: 001_initial_schema
-- SpendWisely Expense Tracker — Core Tables
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── users ────────────────────────────────────────────────────
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name        TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT,                           -- NULL if Google OAuth only
  google_id           TEXT UNIQUE,                    -- Google OAuth sub claim
  phone_number        TEXT,                           -- optional, used for Arkesel SMS
  currency            TEXT NOT NULL DEFAULT 'GHS',
  notification_mode   TEXT NOT NULL DEFAULT 'funny'
                        CHECK (notification_mode IN ('funny', 'serious')),
  alert_frequency     TEXT NOT NULL DEFAULT 'all'
                        CHECK (alert_frequency IN ('all', 'budget', 'weekly', 'off')),
  -- budget_reset_day is the USER'S payday / preferred reset date (1–28)
  -- All budgets inherit this by default but can override per-budget
  budget_reset_day    INTEGER NOT NULL DEFAULT 1
                        CHECK (budget_reset_day BETWEEN 1 AND 28),
  budget_reset_interval TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (budget_reset_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── expenses ─────────────────────────────────────────────────
CREATE TABLE expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category          TEXT NOT NULL,
  merchant          TEXT NOT NULL,
  description       TEXT,
  note              TEXT,
  date              TIMESTAMPTZ NOT NULL,
  source            TEXT NOT NULL CHECK (source IN ('manual', 'email')),
  transaction_type  TEXT NOT NULL DEFAULT 'debit'
                      CHECK (transaction_type IN ('debit', 'credit')),
  -- channel identifies the payment method: 'MTN MoMo', 'GCB Bank', 'Ecobank', etc.
  channel           TEXT,
  -- gmail_message_id used for deduplication — prevents re-parsing same email
  email_message_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_expenses_user_date     ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_user_category ON expenses(user_id, category);
CREATE INDEX idx_expenses_user_source   ON expenses(user_id, source);
CREATE INDEX idx_expenses_merchant      ON expenses(user_id, LOWER(merchant));

-- Unique index prevents double-parsing the same Gmail message
CREATE UNIQUE INDEX idx_expenses_email_dedup
  ON expenses(user_id, email_message_id)
  WHERE email_message_id IS NOT NULL;

-- ── budgets ──────────────────────────────────────────────────
-- NOTE: 'spent' is never stored here — it is always computed at query time
-- as SUM(expenses.amount) WHERE date >= last_reset_at AND transaction_type = 'debit'
-- This means all historical expense data is preserved even after budget resets.
CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  limit_amount  NUMERIC(12, 2) NOT NULL CHECK (limit_amount > 0),
  -- reset_day: day of month this budget resets (inherits from user.budget_reset_day by default)
  reset_day     INTEGER NOT NULL DEFAULT 1
                  CHECK (reset_day BETWEEN 1 AND 28),
  reset_interval TEXT NOT NULL DEFAULT 'monthly'
                  CHECK (reset_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  -- last_reset_at: start of the CURRENT budget period
  -- Expenses dated before this are in a past period (viewable in Insights / budget_history)
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category)
);

CREATE INDEX idx_budgets_user ON budgets(user_id);

-- ── budget_history ───────────────────────────────────────────
-- Stores a snapshot of each completed budget period.
-- Created by the budgetReset.worker.ts BEFORE resetting last_reset_at.
-- Gives users historical budget performance data in the Insights tab.
CREATE TABLE budget_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id     UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  limit_amount  NUMERIC(12, 2) NOT NULL,
  total_spent   NUMERIC(12, 2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_history_user ON budget_history(user_id, period_end DESC);

-- ── get_budgets_with_spent RPC ────────────────────────────────
-- Called by budgets.repository.ts to compute live 'spent' without a JOIN in application code
CREATE OR REPLACE FUNCTION get_budgets_with_spent(p_user_id UUID)
RETURNS TABLE (
  id            UUID,
  user_id       UUID,
  category      TEXT,
  limit_amount  NUMERIC,
  reset_day     INTEGER,
  reset_interval TEXT,
  last_reset_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ,
  spent         NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.user_id,
    b.category,
    b.limit_amount,
    b.reset_day,
    b.reset_interval,
    b.last_reset_at,
    b.created_at,
    COALESCE(
      (
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.user_id = b.user_id
          AND e.category = b.category
          AND e.transaction_type = 'debit'
          AND e.date >= b.last_reset_at
      ),
      0
    ) AS spent
  FROM budgets b
  WHERE b.user_id = p_user_id
  ORDER BY b.category;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── merchant_category_overrides ───────────────────────────────
-- User-confirmed merchant→category mappings that override the global map.
-- Populated when a user corrects a low-confidence email parse.
CREATE TABLE merchant_category_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant    TEXT NOT NULL,
  category    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, merchant)
);
