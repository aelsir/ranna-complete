-- Extend v_artists + v_narrators with recent-popularity columns so the
-- all-artists / all-authors lists in the app can sort by "what people
-- actually listened to recently" instead of alphabetically.
--
-- Two new columns on each view:
--   recent_play_count       — total plays in the last 30 days across all
--                             of the artist's/author's approved tracks.
--   recent_completed_plays  — subset of the above where completed = TRUE.
--                             Better signal than raw play count because it
--                             rewards artists whose work people FINISH,
--                             not just open-and-skip.
--
-- Both columns come from `v_user_plays_external`, so internal-user QA
-- listening is excluded automatically. 30-day rolling window.
--
-- IMPORTANT — why DROP + CREATE instead of CREATE OR REPLACE:
--   The underlying `artists` / `authors` tables have had columns added
--   since the original view was defined (e.g. `thumbnail_url`). That
--   shifts the position of computed columns like `track_count` inside
--   the `SELECT a.*, ... AS track_count` expansion. Postgres rejects
--   CREATE OR REPLACE in that case because it would rename a column.
--
-- Functions that reference these views (get_home_data, get_artist_profile,
-- get_narrator_profile, search_all) all use `SELECT *` patterns at call
-- time — they have no compile-time dependency on the view shape, so the
-- DROP+CREATE inside a single transaction is safe. They keep working
-- through the migration without re-compilation.

BEGIN;

DROP VIEW IF EXISTS v_artists;

CREATE VIEW v_artists AS
SELECT
    a.*,
    COALESCE(tc.track_count, 0)::integer            AS track_count,
    COALESCE(rp.recent_plays, 0)::integer           AS recent_play_count,
    COALESCE(rp.recent_completed, 0)::integer       AS recent_completed_plays
FROM artists a
LEFT JOIN (
    -- Per-artist approved-track count.
    SELECT artist_id, COUNT(*) AS track_count
    FROM tracks
    WHERE status = 'approved'
    GROUP BY artist_id
) tc ON tc.artist_id = a.id
LEFT JOIN (
    -- Per-artist plays + completions in the last 30 days. Joined via
    -- the artist's tracks so we don't need a denormalised play row.
    SELECT
        t.artist_id,
        COUNT(*)                          AS recent_plays,
        COUNT(*) FILTER (WHERE up.completed) AS recent_completed
    FROM v_user_plays_external up
    JOIN tracks t ON t.id = up.track_id
    WHERE t.status   = 'approved'
      AND t.artist_id IS NOT NULL
      AND up.played_at >= NOW() - INTERVAL '30 days'
    GROUP BY t.artist_id
) rp ON rp.artist_id = a.id
WHERE a.status = 'approved';


DROP VIEW IF EXISTS v_narrators;

CREATE VIEW v_narrators AS
SELECT
    au.*,
    COALESCE(tc.track_count, 0)::integer            AS track_count,
    COALESCE(rp.recent_plays, 0)::integer           AS recent_play_count,
    COALESCE(rp.recent_completed, 0)::integer       AS recent_completed_plays
FROM authors au
LEFT JOIN (
    SELECT author_id, COUNT(*) AS track_count
    FROM tracks
    WHERE status = 'approved'
    GROUP BY author_id
) tc ON tc.author_id = au.id
LEFT JOIN (
    SELECT
        t.author_id,
        COUNT(*)                            AS recent_plays,
        COUNT(*) FILTER (WHERE up.completed) AS recent_completed
    FROM v_user_plays_external up
    JOIN tracks t ON t.id = up.track_id
    WHERE t.status    = 'approved'
      AND t.author_id IS NOT NULL
      AND up.played_at >= NOW() - INTERVAL '30 days'
    GROUP BY t.author_id
) rp ON rp.author_id = au.id
WHERE au.status = 'approved';

COMMENT ON COLUMN v_artists.recent_play_count IS
  '30-day plays from v_user_plays_external (internal-user-excluded).';
COMMENT ON COLUMN v_artists.recent_completed_plays IS
  '30-day completed plays. Primary sort key for the all-artists list.';
COMMENT ON COLUMN v_narrators.recent_play_count IS
  '30-day plays from v_user_plays_external (internal-user-excluded).';
COMMENT ON COLUMN v_narrators.recent_completed_plays IS
  '30-day completed plays. Primary sort key for the all-authors list.';

COMMIT;
