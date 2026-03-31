-- Migration 025: Rename tables and columns to generic names
-- madha → tracks, madiheen → artists, ruwat → authors
-- madih_id → artist_id, rawi_id → author_id, madha_id → track_id
--
-- Strategy: Rename tables + columns, then create backward-compatible
-- alias views so existing frontend code continues working unchanged.
-- All RPC functions are recreated to use the new names internally
-- but output the old column names for frontend compatibility.

-- ============================================
-- 1. DROP all dependent views (will be recreated below)
-- ============================================
DROP VIEW IF EXISTS v_tracks CASCADE;
DROP VIEW IF EXISTS v_tracks_admin CASCADE;
DROP VIEW IF EXISTS v_artists CASCADE;
DROP VIEW IF EXISTS v_narrators CASCADE;
DROP VIEW IF EXISTS v_collections CASCADE;

-- ============================================
-- 2. Rename tables
-- ============================================
ALTER TABLE madha RENAME TO tracks;
ALTER TABLE madiheen RENAME TO artists;
ALTER TABLE ruwat RENAME TO authors;

-- ============================================
-- 3. Rename FK columns on tracks
-- ============================================
ALTER TABLE tracks RENAME COLUMN madih_id TO artist_id;
ALTER TABLE tracks RENAME COLUMN rawi_id TO author_id;

-- ============================================
-- 4. Rename FK columns on related tables
-- ============================================
ALTER TABLE collection_items RENAME COLUMN madha_id TO track_id;
ALTER TABLE user_favorites RENAME COLUMN madha_id TO track_id;
ALTER TABLE user_plays RENAME COLUMN madha_id TO track_id;
ALTER TABLE listening_history RENAME COLUMN madha_id TO track_id;
ALTER TABLE play_events RENAME COLUMN madha_id TO track_id;

-- ============================================
-- 5. Add new columns to tracks
-- ============================================
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'madha';

-- ============================================
-- 6. Create backward-compatible ALIAS VIEWS
-- ============================================

-- madha alias (outputs old column names madih_id and rawi_id)
CREATE OR REPLACE VIEW madha AS
SELECT
    id, title, madih, writer, audio_url, image_url,
    artist_id AS madih_id, author_id AS rawi_id,
    user_id, status, needs_processing, rejection_reason,
    reviewed_by, reviewed_at, source_url,
    recording_place, tariqa_id, fan_id,
    play_count, duration_seconds, is_featured,
    lyrics, created_at, updated_at,
    file_size_bytes, thumbnail_url, content_type
FROM tracks;

-- madiheen alias
CREATE OR REPLACE VIEW madiheen AS SELECT * FROM artists;

-- ruwat alias
CREATE OR REPLACE VIEW ruwat AS SELECT * FROM authors;

-- ============================================
-- 7. INSTEAD OF triggers on madha alias
-- ============================================

-- INSERT on madha view
CREATE OR REPLACE FUNCTION madha_alias_insert_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO tracks (
        id, title, madih, writer, audio_url, image_url,
        artist_id, author_id,
        user_id, status, needs_processing, rejection_reason,
        reviewed_by, reviewed_at, source_url,
        recording_place, tariqa_id, fan_id,
        play_count, duration_seconds, is_featured,
        lyrics, created_at, updated_at,
        file_size_bytes, thumbnail_url, content_type
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.title, NEW.madih, NEW.writer, NEW.audio_url, NEW.image_url,
        NEW.madih_id, NEW.rawi_id,
        NEW.user_id, COALESCE(NEW.status, 'pending'), NEW.needs_processing, NEW.rejection_reason,
        NEW.reviewed_by, NEW.reviewed_at, NEW.source_url,
        NEW.recording_place, NEW.tariqa_id, NEW.fan_id,
        COALESCE(NEW.play_count, 0), NEW.duration_seconds, COALESCE(NEW.is_featured, false),
        NEW.lyrics, COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()),
        NEW.file_size_bytes, NEW.thumbnail_url, COALESCE(NEW.content_type, 'madha')
    )
    RETURNING id, title, madih, writer, audio_url, image_url,
        artist_id AS madih_id, author_id AS rawi_id,
        user_id, status, needs_processing, rejection_reason,
        reviewed_by, reviewed_at, source_url,
        recording_place, tariqa_id, fan_id,
        play_count, duration_seconds, is_featured,
        lyrics, created_at, updated_at,
        file_size_bytes, thumbnail_url, content_type
    INTO NEW;
    RETURN NEW;
END;
$$;

CREATE TRIGGER madha_alias_insert
    INSTEAD OF INSERT ON madha
    FOR EACH ROW EXECUTE FUNCTION madha_alias_insert_fn();

-- UPDATE on madha view
CREATE OR REPLACE FUNCTION madha_alias_update_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE tracks SET
        title = NEW.title,
        madih = NEW.madih,
        writer = NEW.writer,
        audio_url = NEW.audio_url,
        image_url = NEW.image_url,
        artist_id = NEW.madih_id,
        author_id = NEW.rawi_id,
        user_id = NEW.user_id,
        status = NEW.status,
        needs_processing = NEW.needs_processing,
        rejection_reason = NEW.rejection_reason,
        reviewed_by = NEW.reviewed_by,
        reviewed_at = NEW.reviewed_at,
        source_url = NEW.source_url,
        recording_place = NEW.recording_place,
        tariqa_id = NEW.tariqa_id,
        fan_id = NEW.fan_id,
        play_count = NEW.play_count,
        duration_seconds = NEW.duration_seconds,
        is_featured = NEW.is_featured,
        lyrics = NEW.lyrics,
        updated_at = NOW(),
        file_size_bytes = NEW.file_size_bytes,
        thumbnail_url = NEW.thumbnail_url,
        content_type = NEW.content_type
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER madha_alias_update
    INSTEAD OF UPDATE ON madha
    FOR EACH ROW EXECUTE FUNCTION madha_alias_update_fn();

-- DELETE on madha view
CREATE OR REPLACE FUNCTION madha_alias_delete_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tracks WHERE id = OLD.id;
    RETURN OLD;
END;
$$;

CREATE TRIGGER madha_alias_delete
    INSTEAD OF DELETE ON madha
    FOR EACH ROW EXECUTE FUNCTION madha_alias_delete_fn();

-- ============================================
-- 8. INSTEAD OF triggers on madiheen alias
-- ============================================

CREATE OR REPLACE FUNCTION madiheen_alias_insert_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO artists VALUES (NEW.*) RETURNING * INTO NEW;
    RETURN NEW;
END;
$$;
CREATE TRIGGER madiheen_alias_insert
    INSTEAD OF INSERT ON madiheen
    FOR EACH ROW EXECUTE FUNCTION madiheen_alias_insert_fn();

CREATE OR REPLACE FUNCTION madiheen_alias_update_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE artists SET
        name = NEW.name, image_url = NEW.image_url, status = NEW.status,
        bio = NEW.bio, birth_year = NEW.birth_year, death_year = NEW.death_year,
        is_verified = NEW.is_verified, tariqa_id = NEW.tariqa_id,
        created_by = NEW.created_by, reviewed_by = NEW.reviewed_by,
        reviewed_at = NEW.reviewed_at
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER madiheen_alias_update
    INSTEAD OF UPDATE ON madiheen
    FOR EACH ROW EXECUTE FUNCTION madiheen_alias_update_fn();

CREATE OR REPLACE FUNCTION madiheen_alias_delete_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM artists WHERE id = OLD.id;
    RETURN OLD;
END;
$$;
CREATE TRIGGER madiheen_alias_delete
    INSTEAD OF DELETE ON madiheen
    FOR EACH ROW EXECUTE FUNCTION madiheen_alias_delete_fn();

-- ============================================
-- 9. INSTEAD OF triggers on ruwat alias
-- ============================================

CREATE OR REPLACE FUNCTION ruwat_alias_insert_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO authors VALUES (NEW.*) RETURNING * INTO NEW;
    RETURN NEW;
END;
$$;
CREATE TRIGGER ruwat_alias_insert
    INSTEAD OF INSERT ON ruwat
    FOR EACH ROW EXECUTE FUNCTION ruwat_alias_insert_fn();

CREATE OR REPLACE FUNCTION ruwat_alias_update_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE authors SET
        name = NEW.name, image_url = NEW.image_url, status = NEW.status,
        bio = NEW.bio, birth_year = NEW.birth_year, death_year = NEW.death_year,
        created_by = NEW.created_by, reviewed_by = NEW.reviewed_by,
        reviewed_at = NEW.reviewed_at
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER ruwat_alias_update
    INSTEAD OF UPDATE ON ruwat
    FOR EACH ROW EXECUTE FUNCTION ruwat_alias_update_fn();

CREATE OR REPLACE FUNCTION ruwat_alias_delete_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM authors WHERE id = OLD.id;
    RETURN OLD;
END;
$$;
CREATE TRIGGER ruwat_alias_delete
    INSTEAD OF DELETE ON ruwat
    FOR EACH ROW EXECUTE FUNCTION ruwat_alias_delete_fn();


-- ============================================
-- 10. Recreate data views using NEW table names
--     but outputting OLD column names for frontend
-- ============================================

CREATE OR REPLACE VIEW v_tracks AS
SELECT
    t.id, t.title, t.madih, t.writer, t.audio_url, t.image_url,
    t.artist_id AS madih_id, t.author_id AS rawi_id,
    t.user_id, t.status, t.needs_processing, t.rejection_reason,
    t.reviewed_by, t.reviewed_at, t.source_url,
    t.recording_place, t.tariqa_id, t.fan_id,
    t.play_count, t.duration_seconds, t.is_featured,
    t.lyrics, t.created_at, t.updated_at,
    t.file_size_bytes, t.thumbnail_url, t.content_type,
    CASE WHEN a.id IS NOT NULL THEN json_build_object(
        'id', a.id, 'name', a.name, 'image_url', a.image_url,
        'bio', a.bio, 'birth_year', a.birth_year, 'death_year', a.death_year,
        'is_verified', a.is_verified, 'tariqa_id', a.tariqa_id,
        'status', a.status, 'created_at', a.created_at
    ) ELSE NULL END AS madiheen,
    CASE WHEN au.id IS NOT NULL THEN json_build_object(
        'id', au.id, 'name', au.name, 'image_url', au.image_url,
        'bio', au.bio, 'birth_year', au.birth_year, 'death_year', au.death_year,
        'status', au.status, 'created_at', au.created_at
    ) ELSE NULL END AS ruwat,
    CASE WHEN tq.id IS NOT NULL THEN json_build_object(
        'id', tq.id, 'name', tq.name, 'description', tq.description
    ) ELSE NULL END AS turuq,
    CASE WHEN f.id IS NOT NULL THEN json_build_object(
        'id', f.id, 'name', f.name, 'description', f.description
    ) ELSE NULL END AS funun
FROM tracks t
LEFT JOIN artists a ON t.artist_id = a.id
LEFT JOIN authors au ON t.author_id = au.id
LEFT JOIN turuq tq ON t.tariqa_id = tq.id
LEFT JOIN funun f ON t.fan_id = f.id
WHERE t.status = 'approved';

CREATE OR REPLACE VIEW v_tracks_admin AS
SELECT
    t.id, t.title, t.madih, t.writer, t.audio_url, t.image_url,
    t.artist_id AS madih_id, t.author_id AS rawi_id,
    t.user_id, t.status, t.needs_processing, t.rejection_reason,
    t.reviewed_by, t.reviewed_at, t.source_url,
    t.recording_place, t.tariqa_id, t.fan_id,
    t.play_count, t.duration_seconds, t.is_featured,
    t.lyrics, t.created_at, t.updated_at,
    t.file_size_bytes, t.thumbnail_url, t.content_type,
    CASE WHEN a.id IS NOT NULL THEN json_build_object(
        'id', a.id, 'name', a.name, 'image_url', a.image_url,
        'bio', a.bio, 'is_verified', a.is_verified,
        'status', a.status, 'created_at', a.created_at
    ) ELSE NULL END AS madiheen,
    CASE WHEN au.id IS NOT NULL THEN json_build_object(
        'id', au.id, 'name', au.name, 'image_url', au.image_url,
        'status', au.status, 'created_at', au.created_at
    ) ELSE NULL END AS ruwat,
    CASE WHEN tq.id IS NOT NULL THEN json_build_object(
        'id', tq.id, 'name', tq.name, 'description', tq.description
    ) ELSE NULL END AS turuq,
    CASE WHEN f.id IS NOT NULL THEN json_build_object(
        'id', f.id, 'name', f.name, 'description', f.description
    ) ELSE NULL END AS funun
FROM tracks t
LEFT JOIN artists a ON t.artist_id = a.id
LEFT JOIN authors au ON t.author_id = au.id
LEFT JOIN turuq tq ON t.tariqa_id = tq.id
LEFT JOIN funun f ON t.fan_id = f.id;

CREATE OR REPLACE VIEW v_artists AS
SELECT
    a.*,
    COALESCE(tc.track_count, 0)::integer AS track_count
FROM artists a
LEFT JOIN (
    SELECT artist_id, COUNT(*) AS track_count
    FROM tracks WHERE status = 'approved'
    GROUP BY artist_id
) tc ON tc.artist_id = a.id
WHERE a.status = 'approved';

CREATE OR REPLACE VIEW v_narrators AS
SELECT
    au.*,
    COALESCE(tc.track_count, 0)::integer AS track_count
FROM authors au
LEFT JOIN (
    SELECT author_id, COUNT(*) AS track_count
    FROM tracks WHERE status = 'approved'
    GROUP BY author_id
) tc ON tc.author_id = au.id
WHERE au.status = 'approved';

CREATE OR REPLACE VIEW v_collections AS
SELECT
    c.*,
    COALESCE(ic.item_count, 0)::integer AS item_count
FROM collections c
LEFT JOIN (
    SELECT collection_id, COUNT(*) AS item_count
    FROM collection_items GROUP BY collection_id
) ic ON ic.collection_id = c.id
WHERE c.is_active = true;


-- ============================================
-- 11. Recreate RPC functions using NEW names
-- ============================================

-- get_trending_tracks: uses tracks + play_events (track_id)
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
        FROM play_events
        WHERE played_at >= NOW() - (days_window || ' days')::INTERVAL
        GROUP BY track_id
        ORDER BY recent_plays DESC
        LIMIT max_results
    ) trending ON trending.track_id = t.id
    WHERE t.status = 'approved'
    ORDER BY trending.recent_plays DESC;
$$;

GRANT EXECUTE ON FUNCTION get_trending_tracks TO anon, authenticated, service_role;


-- get_home_data: uses tracks for count, v_tracks for data
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

    WITH trending_ids AS (
        SELECT id FROM get_trending_tracks(7, p_limit)
    )
    SELECT COALESCE(json_agg(row_to_json(vt)), '[]'::json) INTO v_trending
    FROM v_tracks vt
    WHERE vt.id IN (SELECT id FROM trending_ids);

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


-- search_all: unchanged logic, same output
-- (v_tracks view already exposes old column names)
CREATE OR REPLACE FUNCTION search_all(p_query TEXT, p_limit INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_tracks_result JSON;
    v_lyrics JSON;
    v_artists_result JSON;
    v_narrators_result JSON;
    normalized TEXT;
BEGIN
    normalized := normalize_arabic(p_query);

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tracks_result
    FROM (
        SELECT * FROM v_tracks vt
        WHERE normalize_arabic(vt.title) LIKE '%' || normalized || '%'
           OR normalize_arabic(COALESCE(vt.madih, '')) LIKE '%' || normalized || '%'
           OR normalize_arabic(COALESCE(vt.writer, '')) LIKE '%' || normalized || '%'
        ORDER BY play_count DESC
        LIMIT p_limit
    ) t;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_lyrics
    FROM (
        SELECT * FROM v_tracks vt
        WHERE normalize_arabic(COALESCE(vt.lyrics, '')) LIKE '%' || normalized || '%'
          AND NOT (
              normalize_arabic(vt.title) LIKE '%' || normalized || '%'
              OR normalize_arabic(COALESCE(vt.madih, '')) LIKE '%' || normalized || '%'
              OR normalize_arabic(COALESCE(vt.writer, '')) LIKE '%' || normalized || '%'
          )
        ORDER BY play_count DESC
        LIMIT p_limit
    ) t;

    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_artists_result
    FROM (
        SELECT * FROM v_artists va
        WHERE normalize_arabic(va.name) LIKE '%' || normalized || '%'
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) a;

    SELECT COALESCE(json_agg(row_to_json(n)), '[]'::json) INTO v_narrators_result
    FROM (
        SELECT * FROM v_narrators vn
        WHERE normalize_arabic(vn.name) LIKE '%' || normalized || '%'
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) n;

    result := json_build_object(
        'tracks', v_tracks_result,
        'lyrics', v_lyrics,
        'artists', v_artists_result,
        'narrators', v_narrators_result
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION search_all TO anon, authenticated, service_role;


-- get_collection_tracks: collection_items.track_id (was madha_id)
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
        INNER JOIN v_tracks vt ON vt.id = ci.track_id
        WHERE ci.collection_id = p_collection_id
    ) t;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_collection_tracks TO anon, authenticated, service_role;


-- get_artist_profile: v_tracks outputs madih_id (alias for artist_id)
CREATE OR REPLACE FUNCTION get_artist_profile(p_artist_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_artist JSON;
    v_artist_tracks JSON;
BEGIN
    SELECT row_to_json(a) INTO v_artist
    FROM v_artists a WHERE a.id = p_artist_id;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_artist_tracks
    FROM (
        SELECT * FROM v_tracks vt
        WHERE vt.madih_id = p_artist_id
        ORDER BY created_at DESC
    ) t;

    result := json_build_object(
        'artist', v_artist,
        'tracks', v_artist_tracks
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_artist_profile TO anon, authenticated, service_role;


-- get_narrator_profile: v_tracks outputs rawi_id (alias for author_id)
CREATE OR REPLACE FUNCTION get_narrator_profile(p_narrator_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_narrator JSON;
    v_narrator_tracks JSON;
BEGIN
    SELECT row_to_json(n) INTO v_narrator
    FROM v_narrators n WHERE n.id = p_narrator_id;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_narrator_tracks
    FROM (
        SELECT * FROM v_tracks vt
        WHERE vt.rawi_id = p_narrator_id
        ORDER BY created_at DESC
    ) t;

    result := json_build_object(
        'narrator', v_narrator,
        'tracks', v_narrator_tracks
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_narrator_profile TO anon, authenticated, service_role;


-- increment_play_count: uses tracks table
CREATE OR REPLACE FUNCTION increment_play_count(p_madha_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE tracks
    SET play_count = play_count + 1
    WHERE id = p_madha_id;
$$;

GRANT EXECUTE ON FUNCTION increment_play_count TO anon, authenticated, service_role;


-- ============================================
-- 12. Fix the updated_at trigger
-- ============================================
-- The trigger was on "madha" which is now "tracks"
-- PostgreSQL auto-follows table renames for triggers,
-- but let's be explicit:
DROP TRIGGER IF EXISTS update_madha_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at
    BEFORE UPDATE ON tracks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Done! All tables renamed, alias views created,
-- RPC functions updated. Zero frontend changes needed.
-- ============================================
