-- Migration 023: Arabic normalization for unified search
-- Moves Arabic text normalization to the database so both frontends
-- get identical search behavior from a single RPC call.

-- 1. Arabic normalization function
-- Matches the JS/Dart normalizeArabic() logic exactly:
--   - Strip tashkeel (diacritics)
--   - Remove tatweel (kashida)
--   - أ إ آ ٱ → ا
--   - ة → ه
--   - ى → ي
--   - ؤ → و
--   - ئ → ي
--   - lowercase + trim

CREATE OR REPLACE FUNCTION normalize_arabic(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT LOWER(TRIM(
        -- Character variant mappings
        TRANSLATE(
            -- Strip tashkeel (diacritics) and tatweel
            REGEXP_REPLACE(
                input,
                '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0640]',
                '',
                'g'
            ),
            -- from chars:  أ      إ      آ      ٱ      ة      ى      ؤ      ئ
            E'\u0623\u0625\u0622\u0671\u0629\u0649\u0624\u0626',
            -- to chars:    ا      ا      ا      ا      ه      ي      و      ي
            E'\u0627\u0627\u0627\u0627\u0647\u064A\u0648\u064A'
        )
    ));
$$;

GRANT EXECUTE ON FUNCTION normalize_arabic TO anon, authenticated, service_role;


-- 2. Updated search_all using normalize_arabic for consistent matching
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
    normalized TEXT;
BEGIN
    -- Normalize the search query once
    normalized := normalize_arabic(p_query);

    -- Tracks matching by title/madih/writer (NOT lyrics)
    -- Search both the original query and normalized version for maximum coverage
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tracks
    FROM (
        SELECT * FROM v_tracks vt
        WHERE normalize_arabic(vt.title) LIKE '%' || normalized || '%'
           OR normalize_arabic(COALESCE(vt.madih, '')) LIKE '%' || normalized || '%'
           OR normalize_arabic(COALESCE(vt.writer, '')) LIKE '%' || normalized || '%'
        ORDER BY play_count DESC
        LIMIT p_limit
    ) t;

    -- Tracks matching by lyrics only (excluding title/madih/writer matches)
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

    -- Artists matching by name
    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_artists
    FROM (
        SELECT * FROM v_artists va
        WHERE normalize_arabic(va.name) LIKE '%' || normalized || '%'
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) a;

    -- Narrators matching by name
    SELECT COALESCE(json_agg(row_to_json(n)), '[]'::json) INTO v_narrators
    FROM (
        SELECT * FROM v_narrators vn
        WHERE normalize_arabic(vn.name) LIKE '%' || normalized || '%'
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
