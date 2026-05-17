-- Adds a "platform usage funnel" to the stats RPC.
--
-- Ranna lets people listen without signing up — accounts only exist for
-- following. That means `unique_listeners` (distinct user_id in
-- user_plays) only catches the small subset of listeners who happen to
-- have an account, and is misleading as a "how many people use the
-- platform" headline. To make the picture honest, expose three
-- conversion stages:
--
--   1. total_accounts        — count(*) from auth.users (top of funnel,
--                              includes any anonymous Supabase sign-ins).
--   2. played_accounts       — distinct user_id in user_plays (same as
--                              unique_listeners, kept here for funnel
--                              clarity).
--   3. registered_accounts   — auth.users with a non-empty email
--                              (real registrations; excludes anonymous).
--
-- All three are all-time totals — funnels read clearest as cumulative
-- counts, not windowed. The other top-bar counters keep their existing
-- windowing.
--
-- Reading auth.users via a SECURITY DEFINER function does NOT count
-- toward Supabase's auth-service MAU billing — that meter only counts
-- auth events (sign-up / sign-in / refresh hitting the auth REST API),
-- not SQL reads of the table.

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
    v_trend_days        INT         := COALESCE(
        LEAST(p_window_days, 90),
        p_trend_days
    );
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
    -- Funnel stages — all-time.
    v_total_accounts    BIGINT;
    v_played_accounts   INT;
    v_registered_accts  BIGINT;
    v_trend             JSON;
    v_heatmap           JSON;
BEGIN
    IF NOT is_admin_or_superuser() THEN
        RAISE EXCEPTION 'forbidden: admin only';
    END IF;

    -- ── Top-bar counters (windowed) ──────────────────────────────────
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

    -- ── Funnel stages (all-time) ─────────────────────────────────────
    -- 1. Every account on file.
    SELECT COUNT(*)::BIGINT
    INTO v_total_accounts
    FROM auth.users;

    -- 2. Accounts that have at least one row in user_plays.
    SELECT COUNT(DISTINCT user_id)
    INTO v_played_accounts
    FROM user_plays
    WHERE user_id IS NOT NULL;

    -- 3. Accounts with a real email — excludes any anonymous Supabase
    --    sign-ins (those have email = NULL or empty).
    SELECT COUNT(*)::BIGINT
    INTO v_registered_accts
    FROM auth.users
    WHERE email IS NOT NULL AND email <> '';

    -- ── Trend (zero-filled, local timezone) ──────────────────────────
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

    -- ── Heatmap (dow × hour, last N weeks, local timezone) ───────────
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
