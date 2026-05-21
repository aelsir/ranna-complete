-- Adds Daily Active Users (DAU) to the stats overview RPC.
--
-- DAU here = count(distinct user_id) per day, where user_id IS NOT NULL.
-- Ranna allows anonymous listening, so this only catches REGISTERED users.
-- The dashboard card warns about this caveat in its description.
--
-- Three new fields are added to the returned JSON:
--   daily_active_users — array of {date, users} for each day in the trend
--                        window, zero-filled.
--   dau_avg            — average users-per-day across the window (numeric).
--   dau_peak           — { date, users } of the busiest day in the window,
--                        or null if the window has zero days with plays.
--
-- Function signature is unchanged (still TEXT, INT, INT, INT), so existing
-- frontend callers keep working.

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

    -- Average DAU across the window — uses the zero-filled series so the
    -- denominator is always the window length, not just active days.
    SELECT ROUND(AVG((row_data ->> 'users')::INT)::NUMERIC, 1)
    INTO v_dau_avg
    FROM json_array_elements(v_dau) row_data;

    -- Peak day — the single date with the highest DAU. Null when every
    -- day in the window had zero registered listeners.
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
