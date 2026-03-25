-- Migration 021: Centralized Views & RPC Functions
-- Moves all query logic to the backend so React and Flutter frontends
-- consume identical data shapes via views and RPC functions.

-- ============================================
-- 1. VIEWS — Pre-joined data shapes
-- ============================================

-- v_tracks: Approved tracks with all related data embedded as JSON
-- Column names match the PostgREST join aliases used by existing frontend code:
--   madiheen, ruwat, turuq, funun
CREATE OR REPLACE VIEW v_tracks AS
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

-- v_tracks_admin: All tracks (including pending/rejected) for admin dashboard
CREATE OR REPLACE VIEW v_tracks_admin AS
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

-- v_artists: Approved artists with track count
CREATE OR REPLACE VIEW v_artists AS
SELECT
    mi.*,
    COALESCE(tc.track_count, 0)::integer AS track_count
FROM madiheen mi
LEFT JOIN (
    SELECT madih_id, COUNT(*) AS track_count
    FROM madha
    WHERE status = 'approved'
    GROUP BY madih_id
) tc ON tc.madih_id = mi.id
WHERE mi.status = 'approved';

-- v_narrators: Approved narrators with track count
CREATE OR REPLACE VIEW v_narrators AS
SELECT
    r.*,
    COALESCE(tc.track_count, 0)::integer AS track_count
FROM ruwat r
LEFT JOIN (
    SELECT rawi_id, COUNT(*) AS track_count
    FROM madha
    WHERE status = 'approved'
    GROUP BY rawi_id
) tc ON tc.rawi_id = r.id
WHERE r.status = 'approved';

-- v_collections: Active collections with item count
CREATE OR REPLACE VIEW v_collections AS
SELECT
    c.*,
    COALESCE(ic.item_count, 0)::integer AS item_count
FROM collections c
LEFT JOIN (
    SELECT collection_id, COUNT(*) AS item_count
    FROM collection_items
    GROUP BY collection_id
) ic ON ic.collection_id = c.id
WHERE c.is_active = true;


-- ============================================
-- 2. RPC FUNCTIONS — Complex query logic
-- ============================================

-- get_home_data: Single call for the entire home page
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


-- search_all: Unified search across tracks, lyrics, artists, narrators
CREATE OR REPLACE FUNCTION search_all(p_query TEXT, p_limit INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_tracks JSON;
    v_lyrics JSON;
    v_artists JSON;
    v_narrators JSON;
    q TEXT;
BEGIN
    q := '%' || p_query || '%';

    -- Tracks matching by title/madih/writer (NOT lyrics)
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tracks
    FROM (
        SELECT * FROM v_tracks vt
        WHERE vt.title ILIKE q OR vt.madih ILIKE q OR vt.writer ILIKE q
        ORDER BY play_count DESC
        LIMIT p_limit
    ) t;

    -- Tracks matching by lyrics only (excluding title/madih/writer matches)
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_lyrics
    FROM (
        SELECT * FROM v_tracks vt
        WHERE vt.lyrics ILIKE q
          AND NOT (vt.title ILIKE q OR vt.madih ILIKE q OR vt.writer ILIKE q)
        ORDER BY play_count DESC
        LIMIT p_limit
    ) t;

    -- Artists matching by name
    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_artists
    FROM (
        SELECT * FROM v_artists va
        WHERE va.name ILIKE q
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) a;

    -- Narrators matching by name
    SELECT COALESCE(json_agg(row_to_json(n)), '[]'::json) INTO v_narrators
    FROM (
        SELECT * FROM v_narrators vn
        WHERE vn.name ILIKE q
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) n;

    result := json_build_object(
        'tracks', v_tracks,
        'lyrics', v_lyrics,
        'artists', v_artists,
        'narrators', v_narrators
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION search_all TO anon, authenticated, service_role;


-- get_collection_tracks: Ordered tracks for a collection with full joins
CREATE OR REPLACE FUNCTION get_collection_tracks(p_collection_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.position), '[]'::json) INTO result
    FROM (
        SELECT ci.position, vt.*
        FROM collection_items ci
        INNER JOIN v_tracks vt ON vt.id = ci.madha_id
        WHERE ci.collection_id = p_collection_id
    ) t;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_collection_tracks TO anon, authenticated, service_role;


-- get_artist_profile: Artist details + their tracks
CREATE OR REPLACE FUNCTION get_artist_profile(p_artist_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_artist JSON;
    v_tracks JSON;
BEGIN
    -- Artist details with track count
    SELECT row_to_json(a) INTO v_artist
    FROM v_artists a
    WHERE a.id = p_artist_id;

    -- Their tracks
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tracks
    FROM (
        SELECT * FROM v_tracks vt
        WHERE vt.madih_id = p_artist_id
        ORDER BY created_at DESC
    ) t;

    result := json_build_object(
        'artist', v_artist,
        'tracks', v_tracks
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_artist_profile TO anon, authenticated, service_role;


-- get_narrator_profile: Narrator details + their tracks
CREATE OR REPLACE FUNCTION get_narrator_profile(p_narrator_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_narrator JSON;
    v_tracks JSON;
BEGIN
    -- Narrator details with track count
    SELECT row_to_json(n) INTO v_narrator
    FROM v_narrators n
    WHERE n.id = p_narrator_id;

    -- Their tracks
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tracks
    FROM (
        SELECT * FROM v_tracks vt
        WHERE vt.rawi_id = p_narrator_id
        ORDER BY created_at DESC
    ) t;

    result := json_build_object(
        'narrator', v_narrator,
        'tracks', v_tracks
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_narrator_profile TO anon, authenticated, service_role;


-- increment_play_count: Safely increment play_count on a track
-- (Create if not exists — web already calls this, Flutter will too)
CREATE OR REPLACE FUNCTION increment_play_count(p_madha_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE madha
    SET play_count = play_count + 1
    WHERE id = p_madha_id;
$$;

GRANT EXECUTE ON FUNCTION increment_play_count TO anon, authenticated, service_role;
