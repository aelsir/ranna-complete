-- Single-RPC aggregator for the admin stats page.
--
-- Previously the dashboard paginated the entire `user_plays` table into
-- the browser TWICE (once in getAnalyticsSummary, once in
-- getEngagementMetrics) and crunched everything client-side. For a 100k-
-- row history that's >1 MB transferred per request, multiple seconds of
-- compute on every page load, and lots of redundant work.
--
-- This RPC pushes all the aggregation into Postgres and returns one
-- compact JSON document with everything the new stats page needs:
--   • top-bar counters     — total_plays, total_hours, unique_listeners,
--                            total_favorites
--   • trend                — per-day {date, plays, minutes} for the last N
--                            days (default 14), zero-filled.
--   • heatmap              — {dow, hour, count} cells for the last N weeks
--                            (default 4), bucketed in the caller's tz.
--
-- All time bucketing is done in the requested timezone (default
-- 'Africa/Khartoum') so the day labels and heatmap rows reflect what
-- listeners actually saw locally, not UTC.
--
-- Admin-only: gated by is_admin_or_superuser() at the top of the body.

CREATE OR REPLACE FUNCTION get_stats_overview(
    p_tz            TEXT DEFAULT 'Africa/Khartoum',
    p_trend_days    INT  DEFAULT 14,
    p_heatmap_weeks INT  DEFAULT 4
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today_local      DATE        := (NOW() AT TIME ZONE p_tz)::DATE;
    v_trend_start      DATE        := v_today_local - (p_trend_days - 1);
    v_heatmap_since    TIMESTAMPTZ := NOW() - (p_heatmap_weeks || ' weeks')::INTERVAL;
    v_total_plays      BIGINT;
    v_total_hours      NUMERIC;
    v_unique_listeners INT;
    v_total_favorites  BIGINT;
    v_trend            JSON;
    v_heatmap          JSON;
BEGIN
    -- Admin gate. The function runs as SECURITY DEFINER so RLS on the
    -- underlying tables is bypassed; this check prevents non-admins
    -- from calling the RPC at all.
    IF NOT is_admin_or_superuser() THEN
        RAISE EXCEPTION 'forbidden: admin only';
    END IF;

    -- ── Top-bar counters (all-time) ──────────────────────────────
    SELECT
        COUNT(*)::BIGINT,
        ROUND(COALESCE(SUM(duration_seconds), 0)::NUMERIC / 3600, 2),
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
    INTO v_total_plays, v_total_hours, v_unique_listeners
    FROM user_plays;

    SELECT COUNT(*)::BIGINT INTO v_total_favorites FROM user_favorites;

    -- ── 14-day trend (zero-filled, local timezone) ───────────────
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

    -- ── Heatmap (last N weeks, dow × hour, local timezone) ───────
    -- dow: 0=Sunday .. 6=Saturday (Postgres' extract(dow) convention).
    -- hour: 0..23.
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
        'total_plays',      v_total_plays,
        'total_hours',      v_total_hours,
        'unique_listeners', v_unique_listeners,
        'total_favorites',  v_total_favorites,
        'trend_days',       p_trend_days,
        'trend',            COALESCE(v_trend,   '[]'::json),
        'heatmap_weeks',    p_heatmap_weeks,
        'heatmap',          COALESCE(v_heatmap, '[]'::json),
        'tz',               p_tz
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_stats_overview TO authenticated, service_role;
