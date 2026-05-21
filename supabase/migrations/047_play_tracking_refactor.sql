-- ============================================================================
-- Play-tracking refactor — items B, C-prep, and D from the analytics audit.
--
-- B. Make every new stats RPC read from v_user_plays_external so internal
--    users can never leak. The legacy summary/engagement queries already
--    used that view; the new ones (042/043/045/046) bypassed it.
-- C-prep. Drop the foreign-key constraint on lyrics_views.play_id. We keep
--    the column as a plain UUID pointer so the clients can stamp a
--    client-generated play_id on a lyrics_view BEFORE the user_plays row
--    exists (the play row is still written at end-of-play; the view fires
--    mid-play). Joining by uuid still works at query time; we just don't
--    enforce ordering with a FK.
-- D. Increment tracks.play_count via an AFTER INSERT trigger on
--    user_plays instead of having the web client call increment_play_count
--    RPC explicitly. Two wins: (1) Flutter inserts now count too — they
--    previously didn't because Flutter never called the RPC; (2) internal
--    users are excluded directly in the trigger, so play_count reflects
--    real-world reach.
-- ============================================================================


-- ── C-prep: drop lyrics_views.play_id FK ────────────────────────────────────
DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    SELECT constraint_name
    INTO v_constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'lyrics_views'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%play_id%';

    IF v_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE lyrics_views DROP CONSTRAINT %I', v_constraint_name);
    END IF;
END $$;

COMMENT ON COLUMN lyrics_views.play_id IS
  'Client-generated UUID linking this view to a user_plays row. NOT a FK '
  'because lyrics views can be inserted before the user_plays row exists '
  '(views happen mid-play; user_plays is written at end-of-play). Join by '
  'uuid at query time.';


-- ── D: play_count trigger (replaces explicit increment_play_count RPC) ─────
CREATE OR REPLACE FUNCTION on_user_plays_insert_increment_play_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_internal BOOLEAN;
BEGIN
    -- Skip if the inserting user is flagged as internal. Anonymous plays
    -- (user_id IS NULL) always count — they're not internal team.
    IF NEW.user_id IS NOT NULL THEN
        SELECT is_internal
        INTO v_is_internal
        FROM user_profiles
        WHERE id = NEW.user_id;

        IF COALESCE(v_is_internal, FALSE) = TRUE THEN
            RETURN NEW;
        END IF;
    END IF;

    UPDATE tracks
    SET play_count = COALESCE(play_count, 0) + 1
    WHERE id = NEW.track_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_plays_increment_play_count ON user_plays;
CREATE TRIGGER user_plays_increment_play_count
    AFTER INSERT ON user_plays
    FOR EACH ROW
    EXECUTE FUNCTION on_user_plays_insert_increment_play_count();


-- ============================================================================
-- B: swap user_plays → v_user_plays_external in all four new stats RPCs.
-- Function signatures unchanged so existing front-end callers keep working.
-- ============================================================================

-- ── get_stats_overview (most-recent body: migration 045 with DAU) ───────────
CREATE OR REPLACE FUNCTION get_stats_overview(
    p_tz            TEXT DEFAULT 'Africa/Khartoum',
    p_trend_days    INT  DEFAULT 14,
    p_heatmap_weeks INT  DEFAULT 4,
    p_window_days   INT  DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trend_days        INT         := COALESCE(LEAST(p_window_days, 90), p_trend_days);
    v_today_local       DATE        := (NOW() AT TIME ZONE p_tz)::DATE;
    v_trend_start       DATE        := v_today_local - (v_trend_days - 1);
    v_heatmap_since     TIMESTAMPTZ := NOW() - (p_heatmap_weeks || ' weeks')::INTERVAL;
    v_window_since      TIMESTAMPTZ := CASE
        WHEN p_window_days IS NOT NULL
            THEN NOW() - (p_window_days || ' days')::INTERVAL
        ELSE NULL
    END;
    v_total_plays       BIGINT;
    v_total_hours       NUMERIC;
    v_unique_listeners  INT;
    v_total_favorites   BIGINT;
    v_total_accounts    BIGINT;
    v_played_accounts   INT;
    v_registered_accts  BIGINT;
    v_trend             JSON;
    v_heatmap           JSON;
    v_dau               JSON;
    v_dau_avg           NUMERIC;
    v_dau_peak          JSON;
BEGIN
    IF NOT is_admin_or_superuser() THEN
        RAISE EXCEPTION 'forbidden: admin only';
    END IF;

    SELECT
        COUNT(*)::BIGINT,
        ROUND(COALESCE(SUM(duration_seconds), 0)::NUMERIC / 3600, 2),
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
    INTO v_total_plays, v_total_hours, v_unique_listeners
    FROM v_user_plays_external
    WHERE v_window_since IS NULL OR played_at >= v_window_since;

    SELECT COUNT(*)::BIGINT
    INTO v_total_favorites
    FROM user_favorites
    WHERE v_window_since IS NULL OR created_at >= v_window_since;

    SELECT COUNT(*)::BIGINT INTO v_total_accounts FROM auth.users;

    SELECT COUNT(DISTINCT user_id) INTO v_played_accounts
    FROM v_user_plays_external
    WHERE user_id IS NOT NULL;

    SELECT COUNT(*)::BIGINT
    INTO v_registered_accts
    FROM auth.users
    WHERE email IS NOT NULL AND email <> '';

    -- plays + minutes trend
    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    bucketed AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE AS day,
            COUNT(*)                            AS plays,
            COALESCE(SUM(duration_seconds), 0)  AS seconds
        FROM v_user_plays_external
        WHERE (played_at AT TIME ZONE p_tz)::DATE BETWEEN v_trend_start AND v_today_local
        GROUP BY 1
    )
    SELECT json_agg(
        json_build_object(
            'date',    to_char(d.day, 'YYYY-MM-DD'),
            'plays',   COALESCE(b.plays, 0),
            'minutes', ROUND(COALESCE(b.seconds, 0)::NUMERIC / 60)
        ) ORDER BY d.day
    )
    INTO v_trend
    FROM days d
    LEFT JOIN bucketed b ON b.day = d.day;

    -- heatmap
    WITH cells AS (
        SELECT
            EXTRACT(DOW  FROM played_at AT TIME ZONE p_tz)::INT AS dow,
            EXTRACT(HOUR FROM played_at AT TIME ZONE p_tz)::INT AS hour,
            COUNT(*)::INT                                       AS plays
        FROM v_user_plays_external
        WHERE played_at >= v_heatmap_since
        GROUP BY dow, hour
    )
    SELECT json_agg(json_build_object('dow', dow, 'hour', hour, 'count', plays))
    INTO v_heatmap
    FROM cells;

    -- DAU (registered, internal-excluded)
    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    dau_per_day AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE AS day,
            COUNT(DISTINCT user_id)::INT       AS users
        FROM v_user_plays_external
        WHERE user_id IS NOT NULL
          AND (played_at AT TIME ZONE p_tz)::DATE BETWEEN v_trend_start AND v_today_local
        GROUP BY 1
    )
    SELECT
        json_agg(
            json_build_object(
                'date',  to_char(d.day, 'YYYY-MM-DD'),
                'users', COALESCE(dpd.users, 0)
            ) ORDER BY d.day
        )
    INTO v_dau
    FROM days d
    LEFT JOIN dau_per_day dpd ON dpd.day = d.day;

    SELECT ROUND(AVG((row_data ->> 'users')::INT)::NUMERIC, 1)
    INTO v_dau_avg
    FROM json_array_elements(v_dau) row_data;

    SELECT row_to_json(x) INTO v_dau_peak
    FROM (
        SELECT
            (row_data ->> 'date')          AS date,
            (row_data ->> 'users')::INT    AS users
        FROM json_array_elements(v_dau) row_data
        ORDER BY (row_data ->> 'users')::INT DESC, (row_data ->> 'date') DESC
        LIMIT 1
    ) x
    WHERE (x.users) > 0;

    RETURN json_build_object(
        'total_plays',         v_total_plays,
        'total_hours',         v_total_hours,
        'unique_listeners',    v_unique_listeners,
        'total_favorites',     v_total_favorites,
        'total_accounts',      v_total_accounts,
        'played_accounts',     v_played_accounts,
        'registered_accounts', v_registered_accts,
        'trend_days',          v_trend_days,
        'trend',               COALESCE(v_trend,   '[]'::json),
        'heatmap_weeks',       p_heatmap_weeks,
        'heatmap',             COALESCE(v_heatmap, '[]'::json),
        'daily_active_users',  COALESCE(v_dau,     '[]'::json),
        'dau_avg',             COALESCE(v_dau_avg, 0),
        'dau_peak',            v_dau_peak,
        'tz',                  p_tz,
        'window_days',         p_window_days
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_stats_overview(TEXT, INT, INT, INT)
TO authenticated, service_role;


-- ── get_completion_stats — switch to external view ─────────────────────────
CREATE OR REPLACE FUNCTION get_completion_stats(
    p_tz          TEXT DEFAULT 'Africa/Khartoum',
    p_trend_days  INT  DEFAULT 30,
    p_window_days INT  DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trend_days     INT         := COALESCE(LEAST(p_window_days, 90), p_trend_days);
    v_today_local    DATE        := (NOW() AT TIME ZONE p_tz)::DATE;
    v_trend_start    DATE        := v_today_local - (v_trend_days - 1);
    v_window_since   TIMESTAMPTZ := CASE
        WHEN p_window_days IS NOT NULL
            THEN NOW() - (p_window_days || ' days')::INTERVAL
        ELSE NULL
    END;
    v_top_tracks       JSON;
    v_daily_trend      JSON;
    v_depth_dist       JSON;
    v_duration_buckets JSON;
BEGIN
    IF NOT is_admin_or_superuser() THEN
        RAISE EXCEPTION 'forbidden: admin only';
    END IF;

    WITH track_stats AS (
        SELECT
            p.track_id,
            COUNT(*) FILTER (WHERE p.completed) AS completed_plays,
            COUNT(*)                            AS total_plays
        FROM v_user_plays_external p
        WHERE v_window_since IS NULL OR p.played_at >= v_window_since
        GROUP BY p.track_id
    )
    SELECT json_agg(row_to_json(x))
    INTO v_top_tracks
    FROM (
        SELECT
            t.id                       AS track_id,
            t.title                    AS title,
            COALESCE(ar.name, '')      AS artist_name,
            COALESCE(au.name, '')      AS author_name,
            ts.completed_plays,
            ts.total_plays,
            CASE WHEN ts.total_plays > 0
                THEN ROUND(100.0 * ts.completed_plays / ts.total_plays, 1)
                ELSE 0
            END AS completion_rate
        FROM track_stats ts
        JOIN tracks t        ON t.id = ts.track_id
        LEFT JOIN artists ar ON ar.id = t.artist_id
        LEFT JOIN authors au ON au.id = t.author_id
        WHERE ts.completed_plays > 0
        ORDER BY ts.completed_plays DESC, ts.total_plays DESC
        LIMIT 10
    ) x;

    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    bucketed AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE       AS day,
            COUNT(*)                                  AS plays,
            COUNT(*) FILTER (WHERE completed)         AS completed
        FROM v_user_plays_external
        WHERE (played_at AT TIME ZONE p_tz)::DATE BETWEEN v_trend_start AND v_today_local
        GROUP BY 1
    )
    SELECT json_agg(
        json_build_object(
            'date',      to_char(d.day, 'YYYY-MM-DD'),
            'plays',     COALESCE(b.plays, 0),
            'completed', COALESCE(b.completed, 0),
            'rate',      CASE
                WHEN COALESCE(b.plays, 0) > 0
                    THEN ROUND(100.0 * b.completed / b.plays, 1)
                ELSE 0
            END
        ) ORDER BY d.day
    )
    INTO v_daily_trend
    FROM days d
    LEFT JOIN bucketed b ON b.day = d.day;

    WITH play_depth AS (
        SELECT
            p.completed,
            CASE
                WHEN t.duration_seconds IS NULL OR t.duration_seconds <= 0 THEN NULL
                WHEN p.completed THEN 1.0
                ELSE LEAST(1.0, GREATEST(0.0,
                    COALESCE(p.duration_seconds, 0)::NUMERIC / t.duration_seconds))
            END AS ratio
        FROM v_user_plays_external p
        JOIN tracks t ON t.id = p.track_id
        WHERE v_window_since IS NULL OR p.played_at >= v_window_since
    ),
    bucketed AS (
        SELECT
            CASE
                WHEN ratio IS NULL    THEN 'unknown'
                WHEN ratio >= 1.0     THEN '100'
                WHEN ratio >= 0.75    THEN '75-99'
                WHEN ratio >= 0.50    THEN '50-75'
                WHEN ratio >= 0.25    THEN '25-50'
                ELSE '0-25'
            END AS bucket,
            COUNT(*)::INT AS plays
        FROM play_depth
        GROUP BY 1
    )
    SELECT json_agg(json_build_object('bucket', bucket, 'plays', plays))
    INTO v_depth_dist
    FROM bucketed;

    WITH classified AS (
        SELECT
            p.completed,
            CASE
                WHEN t.duration_seconds IS NULL OR t.duration_seconds <= 0
                    THEN 'unknown'
                WHEN t.duration_seconds < 120  THEN '0-2'
                WHEN t.duration_seconds < 300  THEN '2-5'
                WHEN t.duration_seconds < 600  THEN '5-10'
                WHEN t.duration_seconds < 1200 THEN '10-20'
                ELSE '20+'
            END AS bucket
        FROM v_user_plays_external p
        JOIN tracks t ON t.id = p.track_id
        WHERE v_window_since IS NULL OR p.played_at >= v_window_since
    ),
    agg AS (
        SELECT
            bucket,
            COUNT(*)::INT                          AS plays,
            COUNT(*) FILTER (WHERE completed)::INT AS completed
        FROM classified
        GROUP BY bucket
    )
    SELECT json_agg(
        json_build_object(
            'bucket',    bucket,
            'plays',     plays,
            'completed', completed,
            'rate',      CASE WHEN plays > 0
                            THEN ROUND(100.0 * completed / plays, 1)
                            ELSE 0
                         END
        )
    )
    INTO v_duration_buckets
    FROM agg;

    RETURN json_build_object(
        'top_tracks',         COALESCE(v_top_tracks,        '[]'::json),
        'daily_trend',        COALESCE(v_daily_trend,       '[]'::json),
        'depth_distribution', COALESCE(v_depth_dist,        '[]'::json),
        'duration_buckets',   COALESCE(v_duration_buckets,  '[]'::json),
        'trend_days',         v_trend_days,
        'tz',                 p_tz,
        'window_days',        p_window_days
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_completion_stats(TEXT, INT, INT)
TO authenticated, service_role;


-- ── get_lyrics_stats — switch to external view ─────────────────────────────
CREATE OR REPLACE FUNCTION get_lyrics_stats(
    p_tz          TEXT DEFAULT 'Africa/Khartoum',
    p_trend_days  INT  DEFAULT 30,
    p_window_days INT  DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trend_days       INT         := COALESCE(LEAST(p_window_days, 90), p_trend_days);
    v_today_local      DATE        := (NOW() AT TIME ZONE p_tz)::DATE;
    v_trend_start      DATE        := v_today_local - (v_trend_days - 1);
    v_window_since     TIMESTAMPTZ := CASE
        WHEN p_window_days IS NOT NULL
            THEN NOW() - (p_window_days || ' days')::INTERVAL
        ELSE NULL
    END;
    v_total_plays       BIGINT;
    v_plays_with_lyrics BIGINT;
    v_total_lyric_views BIGINT;
    v_unique_viewers    INT;
    v_daily_trend       JSON;
BEGIN
    IF NOT is_admin_or_superuser() THEN
        RAISE EXCEPTION 'forbidden: admin only';
    END IF;

    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (
            WHERE t.lyrics IS NOT NULL AND t.lyrics <> ''
        )::BIGINT
    INTO v_total_plays, v_plays_with_lyrics
    FROM v_user_plays_external p
    JOIN tracks t ON t.id = p.track_id
    WHERE v_window_since IS NULL OR p.played_at >= v_window_since;

    SELECT
        COUNT(*)::BIGINT,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::INT
    INTO v_total_lyric_views, v_unique_viewers
    FROM lyrics_views
    WHERE v_window_since IS NULL OR viewed_at >= v_window_since;

    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    plays_daily AS (
        SELECT
            (p.played_at AT TIME ZONE p_tz)::DATE                         AS day,
            COUNT(*)                                                      AS plays,
            COUNT(*) FILTER (
                WHERE t.lyrics IS NOT NULL AND t.lyrics <> ''
            )                                                             AS plays_with_lyrics
        FROM v_user_plays_external p
        JOIN tracks t ON t.id = p.track_id
        WHERE (p.played_at AT TIME ZONE p_tz)::DATE BETWEEN v_trend_start AND v_today_local
        GROUP BY 1
    ),
    views_daily AS (
        SELECT
            (viewed_at AT TIME ZONE p_tz)::DATE  AS day,
            COUNT(*)                             AS lyric_views
        FROM lyrics_views
        WHERE (viewed_at AT TIME ZONE p_tz)::DATE BETWEEN v_trend_start AND v_today_local
        GROUP BY 1
    )
    SELECT json_agg(
        json_build_object(
            'date',              to_char(d.day, 'YYYY-MM-DD'),
            'plays',             COALESCE(pd.plays, 0),
            'plays_with_lyrics', COALESCE(pd.plays_with_lyrics, 0),
            'lyric_views',       COALESCE(vd.lyric_views, 0)
        ) ORDER BY d.day
    )
    INTO v_daily_trend
    FROM days d
    LEFT JOIN plays_daily pd ON pd.day = d.day
    LEFT JOIN views_daily vd ON vd.day = d.day;

    RETURN json_build_object(
        'total_plays',         v_total_plays,
        'plays_with_lyrics',   v_plays_with_lyrics,
        'lyrics_coverage_pct', CASE WHEN v_total_plays > 0
            THEN ROUND(100.0 * v_plays_with_lyrics / v_total_plays, 1)
            ELSE 0
        END,
        'total_lyric_views',   v_total_lyric_views,
        'unique_viewers',      v_unique_viewers,
        'daily_trend',         COALESCE(v_daily_trend, '[]'::json),
        'trend_days',          v_trend_days,
        'tz',                  p_tz,
        'window_days',         p_window_days
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_lyrics_stats(TEXT, INT, INT)
TO authenticated, service_role;
