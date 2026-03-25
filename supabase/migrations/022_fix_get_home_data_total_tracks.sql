-- Migration 022: Add total_tracks to get_home_data RPC
-- Fixes the missing track count in the home page hero banner

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
    -- Total approved track count (for hero banner)
    SELECT COUNT(*) INTO v_total_tracks FROM madha WHERE status = 'approved';

    -- Trending (reuse existing function)
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_trending
    FROM (SELECT * FROM get_trending_tracks(7, p_limit)) t;

    -- Featured tracks
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_featured
    FROM (
        SELECT * FROM v_tracks
        WHERE is_featured = true
        ORDER BY created_at DESC
        LIMIT p_limit
    ) t;

    -- Recent tracks
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_recent
    FROM (
        SELECT * FROM v_tracks
        ORDER BY created_at DESC
        LIMIT p_limit
    ) t;

    -- Popular artists (ordered by track count)
    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_artists
    FROM (
        SELECT * FROM v_artists
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) a;

    -- Popular narrators (ordered by track count)
    SELECT COALESCE(json_agg(row_to_json(n)), '[]'::json) INTO v_narrators
    FROM (
        SELECT * FROM v_narrators
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) n;

    -- Active collections
    SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) INTO v_collections
    FROM (
        SELECT * FROM v_collections
        ORDER BY display_order DESC
        LIMIT 20
    ) c;

    result := json_build_object(
        'total_tracks', v_total_tracks,
        'trending', v_trending,
        'featured', v_featured,
        'recent', v_recent,
        'artists', v_artists,
        'narrators', v_narrators,
        'collections', v_collections
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_home_data TO anon, authenticated, service_role;
