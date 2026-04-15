-- Migration: allow admins to read play_events for analytics
--
-- Context:
-- Migration 020 created the play_events table with RLS enabled but only
-- INSERT policies (authenticated + anon). There is currently no SELECT
-- policy on play_events, which means admin dashboard queries such as
-- "trending this week" (direct table reads, not the SECURITY DEFINER
-- get_trending_tracks RPC) return empty results.
--
-- Migration 026 granted admins SELECT on user_plays and user_favorites
-- but missed play_events. This closes that gap so the analytics section
-- can compute per-track play counts for the trending list supplement.

CREATE POLICY "Admins can view all play events" ON play_events
    FOR SELECT USING (is_admin_or_superuser());


-- Allow admins to view all plays and user profiles for analytics
CREATE POLICY "Admins can view all plays" ON user_plays
    FOR SELECT USING (is_admin_or_superuser());

CREATE POLICY "Admins can view all favorites" ON user_favorites
    FOR SELECT USING (is_admin_or_superuser());
