-- Re-rank "trending" tracks by completion quality, not just raw plays.
--
-- BEFORE: get_trending_tracks ordered by COUNT(*) of plays in the last N
-- days. That gives an almost-static leaderboard — once a track is on the
-- home page, it gets more plays just from being there, so it stays on the
-- home page. Bad feedback loop, low day-to-day variation.
--
-- AFTER: order by COUNT(*) FILTER (WHERE completed) — plays that actually
-- reached the end. A track must EARN its slot by being something
-- listeners finish, not something they click and skip. Min 3 plays in
-- the window to keep brand-new 1-play-100%-completion outliers off the
-- list. Tiebreak by completion rate, then by raw play count.
--
-- Also: read from v_user_plays_external so internal-user QA listening
-- doesn't influence the ranking. Matches the pattern from migration 047.
--
-- Signature unchanged → existing callers (get_home_data, dashboard
-- "trending this week") keep working without any code edit.

CREATE OR REPLACE FUNCTION get_trending_tracks(
    days_window INTEGER DEFAULT 7,
    max_results INTEGER DEFAULT 10
)
RETURNS SETOF tracks
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH agg AS (
        SELECT
            track_id,
            COUNT(*)                          AS plays,
            COUNT(*) FILTER (WHERE completed) AS completed_plays
        FROM v_user_plays_external
        WHERE played_at >= NOW() - (days_window || ' days')::INTERVAL
        GROUP BY track_id
        HAVING COUNT(*) >= 3
    )
    SELECT t.*
    FROM tracks t
    INNER JOIN agg ON agg.track_id = t.id
    WHERE t.status = 'approved'
    ORDER BY
        agg.completed_plays DESC,
        -- Completion rate (with safe divisor) — secondary signal so two
        -- tracks with the same completed count get sorted by how much of
        -- their audience actually stuck with them.
        (agg.completed_plays::NUMERIC / NULLIF(agg.plays, 0)) DESC NULLS LAST,
        -- Final tiebreak: raw play count, so a 5-finished-of-10 beats a
        -- 5-finished-of-6 if both win on the previous tiebreaker (won't
        -- happen mathematically, but kept for determinism).
        agg.plays DESC
    LIMIT max_results;
$$;

GRANT EXECUTE ON FUNCTION get_trending_tracks(INTEGER, INTEGER)
TO anon, authenticated, service_role;


-- Switch get_home_data to use a 14-day window (was 7). Two reasons:
--   • Quality ranking needs a slightly larger sample to be meaningful —
--     a 7-day window often has tracks with only 2-3 plays, which fail
--     the min-3 gate and shrink the list.
--   • Doubles the variety of tracks eligible to surface, addressing the
--     "doesn't change much day-to-day" complaint.
-- Function signature on get_home_data itself doesn't change.

CREATE OR REPLACE FUNCTION get_home_data(p_limit INTEGER DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_trending JSON;
    v_featured JSON;
    v_recent JSON;
    v_artists JSON;
    v_narrators JSON;
    v_collections JSON;
    v_total_tracks INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_tracks FROM tracks WHERE status = 'approved';

    -- 14-day window (was 7). Ordered by completed plays per migration 048.
    WITH trending_ids AS (
        SELECT id FROM get_trending_tracks(14, p_limit)
    )
    SELECT COALESCE(json_agg(row_to_json(vt)), '[]'::json) INTO v_trending
    FROM v_tracks vt
    WHERE vt.id IN (SELECT id FROM trending_ids);

    -- Fallback if no plays in the window: highest-play-count overall.
    -- Same behavior as before — just a safety net for empty installs.
    IF v_trending IS NULL OR v_trending::text = '[]' THEN
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_trending
        FROM (
            SELECT * FROM v_tracks ORDER BY play_count DESC LIMIT p_limit
        ) t;
    END IF;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_featured
    FROM (
        SELECT * FROM v_tracks WHERE is_featured = true
        ORDER BY created_at DESC LIMIT p_limit
    ) t;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_recent
    FROM (
        SELECT * FROM v_tracks ORDER BY created_at DESC LIMIT p_limit
    ) t;

    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_artists
    FROM (
        SELECT * FROM v_artists ORDER BY track_count DESC, name ASC LIMIT 20
    ) a;

    SELECT COALESCE(json_agg(row_to_json(n)), '[]'::json) INTO v_narrators
    FROM (
        SELECT * FROM v_narrators ORDER BY track_count DESC, name ASC LIMIT 20
    ) n;

    SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) INTO v_collections
    FROM (
        SELECT * FROM v_collections ORDER BY display_order DESC LIMIT 20
    ) c;

    result := json_build_object(
        'total_tracks', v_total_tracks,
        'trending',     v_trending,
        'featured',     v_featured,
        'recent',       v_recent,
        'artists',      v_artists,
        'narrators',    v_narrators,
        'collections',  v_collections
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_home_data(INTEGER) TO anon, authenticated, service_role;
