-- ============================================================
-- Migration: 002_email_accounts
-- SpendWisely Expense Tracker — Gmail OAuth + Pending Transactions
-- ============================================================

-- ── email_accounts ────────────────────────────────────────────
-- Stores connected Gmail / Outlook OAuth credentials.
-- Tokens are encrypted (AES-256-CBC) before storage in the API layer —
-- they are NEVER stored in plaintext.
CREATE TABLE email_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL DEFAULT 'gmail'
                        CHECK (provider IN ('gmail', 'outlook')),
  email_address       TEXT NOT NULL,
  -- Tokens encrypted with AES-256 key stored in API env (ENCRYPTION_KEY)
  -- Format: <iv_hex>:<ciphertext_hex>
  access_token_enc    TEXT NOT NULL,
  refresh_token_enc   TEXT NOT NULL,
  token_expiry        TIMESTAMPTZ NOT NULL,
  -- historyId used for Gmail incremental sync — only fetches new messages since last scan
  history_id          TEXT NOT NULL DEFAULT '0',
  last_scanned_at     TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One row per email address per user
  UNIQUE(user_id, email_address)
);

CREATE INDEX idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX idx_email_accounts_active ON email_accounts(is_active) WHERE is_active = TRUE;

CREATE TRIGGER email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── pending_email_transactions ────────────────────────────────
-- Stores low-confidence parsed email transactions awaiting user confirmation.
-- Confidence < 85 → saved here.
-- Confidence >= 85 → auto-saved directly to expenses table.
CREATE TABLE pending_email_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id    UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  gmail_message_id    TEXT NOT NULL,
  parsed_amount       NUMERIC(12, 2) NOT NULL CHECK (parsed_amount > 0),
  merchant            TEXT NOT NULL,
  suggested_category  TEXT NOT NULL,
  transaction_type    TEXT NOT NULL DEFAULT 'debit'
                        CHECK (transaction_type IN ('debit', 'credit')),
  channel             TEXT NOT NULL,
  confidence          INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate pending rows for the same Gmail message
  UNIQUE(user_id, gmail_message_id)
);

CREATE INDEX idx_pending_user_status ON pending_email_transactions(user_id, status)
  WHERE status = 'pending';
