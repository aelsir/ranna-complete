-- ============================================
-- 034 — User Follows + Push Notifications
-- ============================================
-- Adds the following capabilities (Phase 1: data layer + opt-in flags only,
-- delivery comes in a later phase):
--   • `user_follows` table — a user can follow any artist / author / tariqa /
--     fan (مادح، راوي، طريقة، فن). One row per (user, target_type, target_id).
--   • `user_profiles.push_notifications` — per-user opt-in for immediate device
--     push notifications when a new track is published in something they follow.
--     The pre-existing `user_profiles.email_notifications` (migration 013)
--     stays as the opt-in for the weekly Friday digest email.
-- Both flags default to TRUE so users get notifications without an extra step;
-- the in-app toggle in the زاويتي screen lets them turn it off.
-- ============================================

-- ─────────────────────────────────────────────
-- 1. user_follows
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL
    CHECK (target_type IN ('artist', 'author', 'tariqa', 'fan')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A user can only follow a given target once.
  UNIQUE (user_id, target_type, target_id)
);

-- Lookups: "what does this user follow" (powers the follow state hydrate on
-- app open, and the Friday digest cron job).
CREATE INDEX IF NOT EXISTS idx_user_follows_user
  ON user_follows (user_id, target_type);

-- Lookups: "who follows this artist/author/tariqa/fan" (powers the
-- per-track push fan-out when admin approves a new upload).
CREATE INDEX IF NOT EXISTS idx_user_follows_target
  ON user_follows (target_type, target_id);

-- ─────────────────────────────────────────────
-- 2. RLS — users manage their own follows
-- ─────────────────────────────────────────────
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_follows_self_select ON user_follows;
CREATE POLICY user_follows_self_select ON user_follows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_follows_self_insert ON user_follows;
CREATE POLICY user_follows_self_insert ON user_follows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_follows_self_delete ON user_follows;
CREATE POLICY user_follows_self_delete ON user_follows
  FOR DELETE USING (auth.uid() = user_id);

-- Admins/service-role need read access for the Friday digest fan-out;
-- service_role bypasses RLS, so no extra policy needed there.

GRANT SELECT, INSERT, DELETE ON user_follows TO authenticated;

-- ─────────────────────────────────────────────
-- 3. Push-notification preference on user_profiles
-- ─────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN user_profiles.email_notifications IS
  'Opt-in for the Friday weekly digest email (curated new tracks from things '
  'the user follows, country-aware).';
COMMENT ON COLUMN user_profiles.push_notifications IS
  'Opt-in for immediate device push notifications when a new track is '
  'published in something the user follows.';

-- ─────────────────────────────────────────────
-- 4. Convenience view — follower counts per target
-- ─────────────────────────────────────────────
-- Used by admin dashboards and (eventually) public "X followers" badges.
CREATE OR REPLACE VIEW v_follower_counts AS
SELECT
  target_type,
  target_id,
  COUNT(*) AS follower_count
FROM user_follows
GROUP BY target_type, target_id;

GRANT SELECT ON v_follower_counts TO authenticated, anon;
