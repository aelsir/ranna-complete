-- Migration 055: previous-period comparison in get_stats_overview
--
-- A number without a baseline is trivia. When the dashboard asks for a
-- bounded window (p_window_days = 7/30/90), the RPC now also aggregates the
-- window immediately BEFORE it — e.g. for "last 30 days" it returns the
-- 30 days before those — so every KPI card can show an honest delta.
--
-- One new key in the returned JSON:
--   prev — { total_plays, total_hours, unique_listeners, total_favorites }
--          over [now - 2*window, now - window), or NULL when the caller
--          asked for lifetime stats (p_window_days IS NULL — "all time"
--          has no previous period to compare against).
--
-- Function signature is unchanged (TEXT, INT, INT, INT); existing callers
-- keep working and simply ignore the extra key until the frontend reads it.

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
    -- Previous window of equal length, ending where the current one starts.
    v_prev_since        TIMESTAMPTZ := CASE
        WHEN p_window_days IS NOT NULL
            THEN NOW() - (p_window_days * 2 || ' days')::INTERVAL
        ELSE NULL
    END;
    v_total_plays       BIGINT;
    v_total_hours       NUMERIC;
    v_unique_listeners  INT;
    v_total_favorites   BIGINT;
    v_prev               JSON;
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
    FROM user_plays
    WHERE v_window_since IS NULL OR played_at >= v_window_since;

    SELECT COUNT(*)::BIGINT
    INTO v_total_favorites
    FROM user_favorites
    WHERE v_window_since IS NULL OR created_at >= v_window_since;

    -- ── Previous equal-length window (bounded windows only) ─────────────
    IF p_window_days IS NOT NULL THEN
        SELECT json_build_object(
            'total_plays',      COALESCE(p.plays, 0),
            'total_hours',      COALESCE(p.hours, 0),
            'unique_listeners', COALESCE(p.listeners, 0),
            'total_favorites',  COALESCE(f.favs, 0)
        )
        INTO v_prev
        FROM (
            SELECT
                COUNT(*)::BIGINT AS plays,
                ROUND(COALESCE(SUM(duration_seconds), 0)::NUMERIC / 3600, 2) AS hours,
                COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS listeners
            FROM user_plays
            WHERE played_at >= v_prev_since AND played_at < v_window_since
        ) p
        CROSS JOIN (
            SELECT COUNT(*)::BIGINT AS favs
            FROM user_favorites
            WHERE created_at >= v_prev_since AND created_at < v_window_since
        ) f;
    END IF;

    SELECT COUNT(*)::BIGINT INTO v_total_accounts FROM auth.users;

    SELECT COUNT(DISTINCT user_id) INTO v_played_accounts
    FROM user_plays
    WHERE user_id IS NOT NULL;

    SELECT COUNT(*)::BIGINT
    INTO v_registered_accts
    FROM auth.users
    WHERE email IS NOT NULL AND email <> '';

    -- ── plays + minutes trend ────────────────────────────────────────
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

    -- ── heatmap ──────────────────────────────────────────────────────
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

    -- ── Daily Active Users (registered only — anonymous plays excluded) ──
    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    dau_per_day AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE AS day,
            COUNT(DISTINCT user_id)::INT       AS users
        FROM user_plays
        WHERE user_id IS NOT NULL
          AND (played_at AT TIME ZONE p_tz)::DATE BETWEEN v_trend_start AND v_today_local
        GROUP BY (played_at AT TIME ZONE p_tz)::DATE
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
        'prev',                v_prev,
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
