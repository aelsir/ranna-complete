-- Fix both stats RPCs to use the post-025 table & column names.
--
-- Migration 025 renamed:
--   madiheen        → artists
--   ruwat           → authors
--   tracks.madih_id → tracks.artist_id
--   tracks.rawi_id  → tracks.author_id
--
-- The earlier migrations 042 (get_stats_overview) and 043
-- (get_completion_stats) were written against the old names and now
-- raise:
--   ERROR 42703  column t.madih_id does not exist
-- This migration replaces both function bodies to use the current
-- names. Function signatures are unchanged, so no parameter / GRANT
-- updates are needed and existing front-end callers keep working.
--
-- We also rename the output field `narrator_name` → `author_name` in
-- get_completion_stats so the JSON payload matches the new vocabulary.

-- ============================================================================
-- get_stats_overview — unchanged shape; only the table/column names move.
-- ============================================================================

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
BEGIN
    IF NOT is_admin_or_superuser() THEN
        RAISE EXCEPTION 'forbidden: admin only';
    END IF;

    SELECT
        COUNT(*)::BIGINT,
        ROUND(COALESCE(SUM(duration_seconds), 0)::NUMERIC / 3600, 2),
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
    INTO v_total_plays, v_total_hours, v_unique_listeners
    FROM user_plays
    WHERE v_window_since IS NULL OR played_at >= v_window_since;

    SELECT COUNT(*)::BIGINT
    INTO v_total_favorites
    FROM user_favorites
    WHERE v_window_since IS NULL OR created_at >= v_window_since;

    SELECT COUNT(*)::BIGINT INTO v_total_accounts FROM auth.users;

    SELECT COUNT(DISTINCT user_id) INTO v_played_accounts
    FROM user_plays
    WHERE user_id IS NOT NULL;

    SELECT COUNT(*)::BIGINT
    INTO v_registered_accts
    FROM auth.users
    WHERE email IS NOT NULL AND email <> '';

    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    bucketed AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE AS day,
            COUNT(*)                            AS plays,
            COALESCE(SUM(duration_seconds), 0)  AS seconds
        FROM user_plays
        WHERE (played_at AT TIME ZONE p_tz)::DATE BETWEEN v_trend_start AND v_today_local
        GROUP BY (played_at AT TIME ZONE p_tz)::DATE
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

    WITH cells AS (
        SELECT
            EXTRACT(DOW  FROM played_at AT TIME ZONE p_tz)::INT AS dow,
            EXTRACT(HOUR FROM played_at AT TIME ZONE p_tz)::INT AS hour,
            COUNT(*)::INT                                       AS plays
        FROM user_plays
        WHERE played_at >= v_heatmap_since
        GROUP BY dow, hour
    )
    SELECT json_agg(json_build_object('dow', dow, 'hour', hour, 'count', plays))
    INTO v_heatmap
    FROM cells;

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
        'tz',                  p_tz,
        'window_days',         p_window_days
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_stats_overview(TEXT, INT, INT, INT)
TO authenticated, service_role;


-- ============================================================================
-- get_completion_stats — now joins `artists` + `authors` via the renamed
-- foreign keys, and exposes `author_name` instead of the legacy
-- `narrator_name` field.
-- ============================================================================

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

    -- 1. Top 10 by completed plays
    WITH track_stats AS (
        SELECT
            p.track_id,
            COUNT(*) FILTER (WHERE p.completed) AS completed_plays,
            COUNT(*)                            AS total_plays
        FROM user_plays p
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

    -- 2. Daily completion rate trend
    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    bucketed AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE       AS day,
            COUNT(*)                                  AS plays,
            COUNT(*) FILTER (WHERE completed)         AS completed
        FROM user_plays
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

    -- 3. Listen depth distribution
    WITH play_depth AS (
        SELECT
            p.completed,
            CASE
                WHEN t.duration_seconds IS NULL OR t.duration_seconds <= 0 THEN NULL
                WHEN p.completed THEN 1.0
                ELSE LEAST(1.0, GREATEST(0.0,
                    COALESCE(p.duration_seconds, 0)::NUMERIC / t.duration_seconds))
            END AS ratio
        FROM user_plays p
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

    -- 4. Completion rate by track-length bucket
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
        FROM user_plays p
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
