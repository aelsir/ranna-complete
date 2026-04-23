-- Migration 032: Consolidate play tables
--
-- Drops play_events and listening_history tables.
-- All play tracking now goes through user_plays exclusively.
-- - Trending: get_trending_tracks() now queries user_plays
-- - Continue Listening: new v_recent_listens view on user_plays
-- - Analytics: already on user_plays (no change)

-- ============================================
-- 1. Update get_trending_tracks() to use user_plays
-- ============================================
CREATE OR REPLACE FUNCTION get_trending_tracks(
    days_window INTEGER DEFAULT 7,
    max_results INTEGER DEFAULT 10
)
RETURNS SETOF tracks
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT t.*
    FROM tracks t
    INNER JOIN (
        SELECT track_id, COUNT(*) AS recent_plays
        FROM user_plays
        WHERE played_at >= NOW() - (days_window || ' days')::INTERVAL
        GROUP BY track_id
        ORDER BY recent_plays DESC
        LIMIT max_results
    ) trending ON trending.track_id = t.id
    WHERE t.status = 'approved'
    ORDER BY trending.recent_plays DESC;
$$;

GRANT EXECUTE ON FUNCTION get_trending_tracks TO anon, authenticated, service_role;

-- ============================================
-- 2. Create v_recent_listens view for "Continue Listening"
-- ============================================
CREATE OR REPLACE VIEW v_recent_listens AS
SELECT DISTINCT ON (user_id, track_id)
    user_id,
    track_id,
    played_at AS listened_at
FROM user_plays
WHERE user_id IS NOT NULL
ORDER BY user_id, track_id, played_at DESC;

-- ============================================
-- 3. Drop play_events and listening_history
-- ============================================
DROP TABLE IF EXISTS play_events CASCADE;
DROP TABLE IF EXISTS listening_history CASCADE;
