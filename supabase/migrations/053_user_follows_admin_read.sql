-- ============================================================================
-- 053: Admin read access on user_follows
-- ============================================================================
-- The onboarding-effectiveness dashboard page aggregates follow adoption
-- ("% of new users who followed an artist/narrator within the window").
-- user_follows previously allowed SELECT only on one's own rows, so the
-- admin dashboard saw nothing. Mirror the lyrics_views pattern (046):
-- analytics reads are admin-only territory.

DROP POLICY IF EXISTS user_follows_admin_select ON user_follows;
CREATE POLICY user_follows_admin_select ON user_follows
  FOR SELECT USING (is_admin_or_superuser());
