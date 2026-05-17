-- Aggregator for the new "Completion details" sub-page.
--
-- Returns four datasets in one JSON blob, all derivable from existing
-- user_plays + tracks columns:
--
--   1. top_tracks            — top 10 tracks ranked by *completed* plays,
--                              with artist (madih) and narrator (rawi)
--                              names for display.
--   2. daily_trend           — per-day {date, plays, completed, rate%}
--                              over the window, zero-filled.
--   3. depth_distribution    — histogram of how far through tracks
--                              listeners got: 0-25 / 25-50 / 50-75 /
--                              75-99 / 100 (completed). Plays on tracks
--                              with NULL duration go in 'unknown'.
--   4. duration_buckets      — completion rate sliced by track length:
--                              0-2 / 2-5 / 5-10 / 10-20 / 20+ minutes.
--
-- Windowed by p_window_days (null = lifetime), matching the rest of the
-- stats page. Admin-only via is_admin_or_superuser().

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
    v_top_tracks     JSON;
    v_daily_trend    JSON;
    v_depth_dist     JSON;
    v_duration_buckets JSON;
BEGIN
    IF NOT is_admin_or_superuser() THEN
        RAISE EXCEPTION 'forbidden: admin only';
    END IF;

    -- ── 1. Top 10 tracks by completed plays ──────────────────────────
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
            t.id              AS track_id,
            t.title           AS title,
            COALESCE(m.name, '') AS artist_name,
            COALESCE(r.name, '') AS narrator_name,
            ts.completed_plays,
            ts.total_plays,
            CASE WHEN ts.total_plays > 0
                THEN ROUND(100.0 * ts.completed_plays / ts.total_plays, 1)
                ELSE 0
            END AS completion_rate
        FROM track_stats ts
        JOIN tracks t       ON t.id = ts.track_id
        LEFT JOIN madiheen m ON m.id = t.madih_id
        LEFT JOIN ruwat r    ON r.id = t.rawi_id
        WHERE ts.completed_plays > 0
        ORDER BY ts.completed_plays DESC, ts.total_plays DESC
        LIMIT 10
    ) x;

    -- ── 2. Daily completion rate trend (zero-filled) ─────────────────
    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    bucketed AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE             AS day,
            COUNT(*)                                        AS plays,
            COUNT(*) FILTER (WHERE completed)               AS completed
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

    -- ── 3. Listen depth distribution ─────────────────────────────────
    -- ratio = play_duration / track_duration; clamped to [0, 1].
    -- `completed=true` forces 100 even if the recorded play duration is
    -- short (the client marks completion explicitly when a track ends).
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

    -- ── 4. Completion rate by track-length bucket ────────────────────
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
            COUNT(*)::INT                       AS plays,
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
