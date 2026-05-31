-- ============================================================
-- Migration: 004_rls_policies
-- SpendWisely Expense Tracker — Row-Level Security & Policies
-- ============================================================

-- Enable RLS on all core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_email_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_category_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- ── 1. users policies ──────────────────────────────────────────
CREATE POLICY "Allow users to read their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Allow users to update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Allow users to delete their own profile"
  ON users FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ── 2. expenses policies ───────────────────────────────────────
CREATE POLICY "Allow users to read their own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── 3. budgets policies ────────────────────────────────────────
CREATE POLICY "Allow users to read their own budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── 4. budget_history policies ─────────────────────────────────
CREATE POLICY "Allow users to read their own budget history"
  ON budget_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own budget history"
  ON budget_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── 5. email_accounts policies ─────────────────────────────────
CREATE POLICY "Allow users to read their own email accounts"
  ON email_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own email accounts"
  ON email_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own email accounts"
  ON email_accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own email accounts"
  ON email_accounts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── 6. pending_email_transactions policies ─────────────────────
CREATE POLICY "Allow users to read their own pending transactions"
  ON pending_email_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own pending transactions"
  ON pending_email_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own pending transactions"
  ON pending_email_transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own pending transactions"
  ON pending_email_transactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── 7. merchant_category_overrides policies ───────────────────
CREATE POLICY "Allow users to read their own category overrides"
  ON merchant_category_overrides FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own category overrides"
  ON merchant_category_overrides FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own category overrides"
  ON merchant_category_overrides FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own category overrides"
  ON merchant_category_overrides FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── 8. notification_history policies ───────────────────────────
CREATE POLICY "Allow users to read their own notification history"
  ON notification_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own notification history"
  ON notification_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own notification history"
  ON notification_history FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own notification history"
  ON notification_history FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
