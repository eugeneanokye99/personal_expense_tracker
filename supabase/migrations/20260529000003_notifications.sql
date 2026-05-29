-- ============================================================
-- Migration: 003_notifications
-- SpendWisely Expense Tracker — Notification History + pg_cron
-- ============================================================

-- ── notification_history ──────────────────────────────────────
-- Persists every dispatched notification.
-- Used by:
--   - The frontend to show the nudge card on Home (latest unread pattern alert)
--   - The 24h frequency gate (Redis key mirrors this — Redis is faster at runtime)
--   - Notification bell badge count
CREATE TABLE notification_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL
                CHECK (type IN ('transactional', 'funny', 'encouraging')),
  -- trigger maps to ALERT_COPY keys: 'repeat_merchant', 'budget_over', etc.
  trigger     TEXT NOT NULL,
  message     TEXT NOT NULL,
  -- dismissed: user tapped × on the nudge card
  dismissed   BOOLEAN NOT NULL DEFAULT FALSE,
  -- read_at: user opened the notification list
  read_at     TIMESTAMPTZ,
  fired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_fired   ON notification_history(user_id, fired_at DESC);
CREATE INDEX idx_notif_user_unread  ON notification_history(user_id, read_at)
  WHERE read_at IS NULL;
CREATE INDEX idx_notif_undismissed  ON notification_history(user_id, dismissed)
  WHERE dismissed = FALSE;

-- ── pg_cron: daily budget reset job ──────────────────────────
-- Requires pg_cron extension (available on Supabase Pro plans).
-- Publishes a budget.reset.check message to RabbitMQ via HTTP extension,
-- or alternatively, calls the budget reset logic directly via a stored procedure.
--
-- NOTE: If pg_cron is not available, set up an external cron (GitHub Actions
-- scheduled workflow, Railway cron, or Render cron job) to call:
--   POST /api/v1/internal/budget-reset  (internal route, requires INTERNAL_API_KEY)

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--   'spendwisely-daily-budget-reset',
--   '0 0 * * *',    -- midnight UTC every day
--   $$
--     SELECT net.http_post(
--       url := 'https://your-api-domain.com/api/v1/internal/budget-reset',
--       headers := '{"x-internal-key": "YOUR_INTERNAL_KEY"}'::jsonb,
--       body := json_build_object('date', NOW()::date)::text
--     );
--   $$
-- );

-- ── Helper view: unread notification counts per user ──────────
CREATE OR REPLACE VIEW user_notification_summary AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE read_at IS NULL AND dismissed = FALSE) AS unread_count,
  COUNT(*) FILTER (WHERE type = 'funny' AND fired_at > NOW() - INTERVAL '24 hours') AS funny_last_24h
FROM notification_history
GROUP BY user_id;
