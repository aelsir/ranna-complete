-- Extends get_stats_overview with a global window filter (p_window_days).
-- The earlier version returned all-time top-bar counters; admins want to
-- scope the whole page to "last week / month / 90 days / lifetime".
--
-- Semantics:
--   p_window_days = NULL  →  lifetime (no time bound)
--   p_window_days = N     →  WHERE played_at >= NOW() - N days
-- Applied to: total_plays, total_hours, unique_listeners, total_favorites
-- (via user_favorites.created_at), AND the trend chart's window. Heatmap
-- still uses its own `p_heatmap_weeks` since it's specifically about
-- intraday/intraweek patterns, not absolute date range.
--
-- The trend chart's daily granularity stays the same but the number of
-- buckets is min(p_window_days, 90). For lifetime we fall back to 30
-- days so the chart is still legible.

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
    -- Effective trend window: caller's window if set (capped at 90 for
    -- readability), else the explicit p_trend_days fallback.
    v_trend_days       INT         := COALESCE(
        LEAST(p_window_days, 90),
        p_trend_days
    );
    v_today_local      DATE        := (NOW() AT TIME ZONE p_tz)::DATE;
    v_trend_start      DATE        := v_today_local - (v_trend_days - 1);
    v_heatmap_since    TIMESTAMPTZ := NOW() - (p_heatmap_weeks || ' weeks')::INTERVAL;
    -- Global window cutoff: NULL → lifetime (no filter).
    v_window_since     TIMESTAMPTZ := CASE
        WHEN p_window_days IS NOT NULL
            THEN NOW() - (p_window_days || ' days')::INTERVAL
        ELSE NULL
    END;
    v_total_plays      BIGINT;
    v_total_hours      NUMERIC;
    v_unique_listeners INT;
    v_total_favorites  BIGINT;
    v_trend            JSON;
    v_heatmap          JSON;
BEGIN
    IF NOT is_admin_or_superuser() THEN
        RAISE EXCEPTION 'forbidden: admin only';
    END IF;

    -- ── Top-bar counters (windowed if p_window_days set, else all-time) ──
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

    -- ── Trend (zero-filled daily buckets, in local timezone) ─────────────
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

    -- ── Heatmap (last N weeks, dow × hour, local timezone) ───────────────
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
        'trend_days',       v_trend_days,
        'trend',            COALESCE(v_trend,   '[]'::json),
        'heatmap_weeks',    p_heatmap_weeks,
        'heatmap',          COALESCE(v_heatmap, '[]'::json),
        'tz',               p_tz,
        'window_days',      p_window_days
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_stats_overview TO authenticated, service_role;
