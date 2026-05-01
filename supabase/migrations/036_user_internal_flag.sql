-- ============================================
-- 036 — Internal-user flag + analytics-filtered views
-- ============================================
-- Marks accounts whose activity should be excluded from analytics
-- (founder, team, designers, internal testers). Defaults FALSE so
-- existing users aren't accidentally hidden.
--
-- The actual filtering happens via three new views — `v_user_plays_external`,
-- `v_user_favorites_external`, `v_download_events_external` — that LEFT JOIN
-- `user_profiles` and apply `WHERE up.is_internal IS NOT TRUE`. The 3-valued
-- logic correctly keeps:
--   • FALSE  (real user, not internal)         → included
--   • NULL   (no profile row, e.g. anon play)  → included
-- and excludes only:
--   • TRUE   (internal team)                   → excluded
--
-- Anonymous users are NEVER filtered. Anon-first is Ranna's load-bearing
-- model and their activity is the canonical signal.
-- ============================================

-- ─────────────────────────────────────────────
-- 1. Column + partial index
-- ─────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index: tiny (only covers the ~5–10 internal accounts that ever
-- exist) but makes admin tooling like "list all internal users" instant.
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_internal
  ON user_profiles (is_internal) WHERE is_internal = TRUE;

COMMENT ON COLUMN user_profiles.is_internal IS
  'Excludes this user from analytics aggregations (plays, favorites, '
  'follows, downloads). Used for founder + internal team accounts. '
  'Filtered in every analytics query and short-circuited at recordPlay.';

-- ─────────────────────────────────────────────
-- 2. Filtered views — drop-in replacements for analytics queries
-- ─────────────────────────────────────────────
-- Analytics functions in `web/src/lib/api/analytics.ts` should read from
-- these views instead of the underlying tables. That makes the filter
-- impossible to forget on a per-query basis.

CREATE OR REPLACE VIEW v_user_plays_external AS
SELECT up.*
FROM user_plays up
LEFT JOIN user_profiles prof ON prof.id = up.user_id
WHERE prof.is_internal IS NOT TRUE;

CREATE OR REPLACE VIEW v_user_favorites_external AS
SELECT uf.*
FROM user_favorites uf
LEFT JOIN user_profiles prof ON prof.id = uf.user_id
WHERE prof.is_internal IS NOT TRUE;

CREATE OR REPLACE VIEW v_download_events_external AS
SELECT de.*
FROM download_events de
LEFT JOIN user_profiles prof ON prof.id = de.user_id
WHERE prof.is_internal IS NOT TRUE;

-- ─────────────────────────────────────────────
-- 3. Update v_follower_counts to filter internal users
-- ─────────────────────────────────────────────
-- Original definition came from migration 034. Rewriting here so internal
-- follows don't inflate "X followers" badges on artist/author profiles.
CREATE OR REPLACE VIEW v_follower_counts AS
SELECT
  uf.target_type,
  uf.target_id,
  COUNT(*) AS follower_count
FROM user_follows uf
LEFT JOIN user_profiles up ON up.id = uf.user_id
WHERE up.is_internal IS NOT TRUE
GROUP BY uf.target_type, uf.target_id;

-- ─────────────────────────────────────────────
-- 4. Grants — same access pattern as the underlying tables
-- ─────────────────────────────────────────────
GRANT SELECT ON v_user_plays_external      TO authenticated, anon, service_role;
GRANT SELECT ON v_user_favorites_external  TO authenticated, anon, service_role;
GRANT SELECT ON v_download_events_external TO authenticated, anon, service_role;
GRANT SELECT ON v_follower_counts          TO authenticated, anon, service_role;

-- ============================================
-- After applying this migration, mark internal accounts manually.
-- Run as service_role in the SQL editor:
--
--   UPDATE user_profiles SET is_internal = TRUE
--   WHERE id = '<your-uuid>';
--
-- To find your UUID:
--
--   SELECT id, email FROM auth.users WHERE email = 'your.email@example.com';
-- ============================================
