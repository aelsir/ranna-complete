-- Lyrics view event tracking.
--
-- Design: separate events table (not a column on user_plays) because:
--   * Users open lyrics outside of playback (track detail page, profile
--     screens, search results), not only mid-play.
--   * A user can open & close lyrics multiple times in one play — a row
--     per event captures that, a boolean column cannot.
--   * Append-only, sparse — only writes when lyrics actually open.
--   * Future signals (view_duration_seconds, scrolled_to_end, …) can
--     live as columns here without touching the user_plays hot path.
--
-- Optional `play_id` column links a lyrics view to the user_plays row
-- it happened during, when there is one. NULL when the view happened
-- standalone (e.g. on a profile page before pressing play). Lets us
-- answer "of today's plays, how many had a lyrics view?" via a join
-- without changing user_plays.
--
-- Anonymous tracking is supported by allowing user_id NULL — consistent
-- with how user_plays handles signed-out listening.

CREATE TABLE IF NOT EXISTS lyrics_views (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    play_id     UUID REFERENCES user_plays(id) ON DELETE SET NULL,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_type TEXT
);

-- Hot-path indexes: aggregator queries scan by date range; per-track and
-- per-user joins also matter for follow-up analyses.
CREATE INDEX IF NOT EXISTS lyrics_views_viewed_at_idx ON lyrics_views (viewed_at DESC);
CREATE INDEX IF NOT EXISTS lyrics_views_track_id_idx  ON lyrics_views (track_id);
CREATE INDEX IF NOT EXISTS lyrics_views_user_id_idx   ON lyrics_views (user_id)
    WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lyrics_views_play_id_idx   ON lyrics_views (play_id)
    WHERE play_id IS NOT NULL;

ALTER TABLE lyrics_views ENABLE ROW LEVEL SECURITY;

-- INSERT: anyone (including anon) may insert a row, but the row's
-- user_id must match the caller's identity. anon callers MUST pass NULL
-- for user_id; authenticated callers MUST pass their own uid (or NULL,
-- if the app wants to record an anonymous-style event).
CREATE POLICY "Anyone can record their own lyric views"
    ON lyrics_views FOR INSERT
    WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- SELECT: admins only — analytics is admin-only territory.
CREATE POLICY "Admins can read lyric views"
    ON lyrics_views FOR SELECT
    USING (is_admin_or_superuser());


-- ============================================================================
-- record_lyrics_view — the client-facing insert RPC. Handles auth.uid()
-- automatically so the apps don't need to construct it themselves, and
-- silently no-ops on bad track_id rather than raising (a lyrics-view
-- event is never important enough to crash the player).
-- ============================================================================

CREATE OR REPLACE FUNCTION record_lyrics_view(
    p_track_id    UUID,
    p_play_id     UUID DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row_id UUID;
BEGIN
    -- Ignore if the track doesn't exist (e.g. deleted track somehow
    -- referenced by a stale client). Don't raise.
    IF NOT EXISTS (SELECT 1 FROM tracks WHERE id = p_track_id) THEN
        RETURN NULL;
    END IF;

    INSERT INTO lyrics_views (user_id, track_id, play_id, device_type)
    VALUES (auth.uid(), p_track_id, p_play_id, p_device_type)
    RETURNING id INTO v_row_id;

    RETURN v_row_id;
END;
$$;

GRANT EXECUTE ON FUNCTION record_lyrics_view(UUID, UUID, TEXT)
TO anon, authenticated, service_role;


-- ============================================================================
-- get_lyrics_stats — aggregator for the new dashboard Lyrics page.
-- Returns per-day {plays, plays_with_lyrics, lyric_views} over the
-- requested window, zero-filled, plus headline totals. Windowed the
-- same way the other stats RPCs are.
-- ============================================================================

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

    -- ── Headline totals (windowed) ───────────────────────────────────
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (
            WHERE t.lyrics IS NOT NULL AND t.lyrics <> ''
        )::BIGINT
    INTO v_total_plays, v_plays_with_lyrics
    FROM user_plays p
    JOIN tracks t ON t.id = p.track_id
    WHERE v_window_since IS NULL OR p.played_at >= v_window_since;

    SELECT
        COUNT(*)::BIGINT,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::INT
    INTO v_total_lyric_views, v_unique_viewers
    FROM lyrics_views
    WHERE v_window_since IS NULL OR viewed_at >= v_window_since;

    -- ── Daily three-line trend (zero-filled) ─────────────────────────
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
        FROM user_plays p
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
