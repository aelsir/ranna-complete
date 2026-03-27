-- Migration 024: Fix get_home_data to include joins for trending tracks
-- Problem: get_trending_tracks() returns raw madha rows without artist/narrator data,
-- so tracks in the "trending" section have no madiheen/ruwat objects for image fallback.
-- Fix: After getting trending IDs, fetch full data from v_tracks view.

-- Also ensures v_tracks view uses correct column names (madiheen, ruwat, turuq, funun)
-- matching the frontend model expectations.

-- 1. Drop and recreate v_tracks with correct column names
DROP VIEW IF EXISTS v_tracks CASCADE;
CREATE VIEW v_tracks AS
SELECT
    m.*,
    CASE WHEN mi.id IS NOT NULL THEN json_build_object(
        'id', mi.id, 'name', mi.name, 'image_url', mi.image_url,
        'bio', mi.bio, 'birth_year', mi.birth_year, 'death_year', mi.death_year,
        'is_verified', mi.is_verified, 'tariqa_id', mi.tariqa_id,
        'status', mi.status, 'created_at', mi.created_at
    ) ELSE NULL END AS madiheen,
    CASE WHEN r.id IS NOT NULL THEN json_build_object(
        'id', r.id, 'name', r.name, 'image_url', r.image_url,
        'bio', r.bio, 'birth_year', r.birth_year, 'death_year', r.death_year,
        'status', r.status, 'created_at', r.created_at
    ) ELSE NULL END AS ruwat,
    CASE WHEN t.id IS NOT NULL THEN json_build_object(
        'id', t.id, 'name', t.name, 'description', t.description
    ) ELSE NULL END AS turuq,
    CASE WHEN f.id IS NOT NULL THEN json_build_object(
        'id', f.id, 'name', f.name, 'description', f.description
    ) ELSE NULL END AS funun
FROM madha m
LEFT JOIN madiheen mi ON m.madih_id = mi.id
LEFT JOIN ruwat r ON m.rawi_id = r.id
LEFT JOIN turuq t ON m.tariqa_id = t.id
LEFT JOIN funun f ON m.fan_id = f.id
WHERE m.status = 'approved';

-- 2. Drop and recreate v_tracks_admin with correct column names
DROP VIEW IF EXISTS v_tracks_admin CASCADE;
CREATE VIEW v_tracks_admin AS
SELECT
    m.*,
    CASE WHEN mi.id IS NOT NULL THEN json_build_object(
        'id', mi.id, 'name', mi.name, 'image_url', mi.image_url,
        'bio', mi.bio, 'is_verified', mi.is_verified,
        'status', mi.status, 'created_at', mi.created_at
    ) ELSE NULL END AS madiheen,
    CASE WHEN r.id IS NOT NULL THEN json_build_object(
        'id', r.id, 'name', r.name, 'image_url', r.image_url,
        'status', r.status, 'created_at', r.created_at
    ) ELSE NULL END AS ruwat,
    CASE WHEN t.id IS NOT NULL THEN json_build_object(
        'id', t.id, 'name', t.name, 'description', t.description
    ) ELSE NULL END AS turuq,
    CASE WHEN f.id IS NOT NULL THEN json_build_object(
        'id', f.id, 'name', f.name, 'description', f.description
    ) ELSE NULL END AS funun
FROM madha m
LEFT JOIN madiheen mi ON m.madih_id = mi.id
LEFT JOIN ruwat r ON m.rawi_id = r.id
LEFT JOIN turuq t ON m.tariqa_id = t.id
LEFT JOIN funun f ON m.fan_id = f.id;

-- 3. Fix get_home_data: trending now uses v_tracks for full joins
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
    -- Total approved track count
    SELECT COUNT(*) INTO v_total_tracks FROM madha WHERE status = 'approved';

    -- Trending: get IDs from RPC, then fetch full data from v_tracks
    WITH trending_ids AS (
        SELECT id FROM get_trending_tracks(7, p_limit)
    )
    SELECT COALESCE(json_agg(row_to_json(vt)), '[]'::json) INTO v_trending
    FROM v_tracks vt
    WHERE vt.id IN (SELECT id FROM trending_ids);

    -- If no trending data, fall back to popular by play_count
    IF v_trending IS NULL OR v_trending::text = '[]' THEN
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_trending
        FROM (
            SELECT * FROM v_tracks
            ORDER BY play_count DESC
            LIMIT p_limit
        ) t;
    END IF;

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

    -- Popular artists
    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_artists
    FROM (
        SELECT * FROM v_artists
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) a;

    -- Popular narrators
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
