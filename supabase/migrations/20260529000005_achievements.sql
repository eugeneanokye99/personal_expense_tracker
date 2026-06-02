-- ============================================================
-- Migration: 005_achievements
-- SpendWisely Expense Tracker — User Achievements persistence
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Allow users to read their own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own achievements"
  ON public.user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own achievements"
  ON public.user_achievements FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
