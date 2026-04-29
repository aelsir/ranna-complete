-- ============================================
-- 036 — Weekly Digest RPCs (batch + single-user preview)
-- ============================================
-- Defines two functions:
--
--   • get_weekly_digest_batch(p_since)
--     Returns the digest for EVERY eligible user in a single query.
--     This is what the `weekly_digest` edge function calls. Collapses
--     what would otherwise be O(N) round trips between the edge function
--     and the database into O(1).
--
--   • get_weekly_digest(p_user_id, p_since)
--     Returns one user's digest as JSONB. Used for ad-hoc admin
--     previews ("what would Ahmed get this Friday?") from the SQL
--     editor. The edge function does NOT call this.
--
-- "Eligible" = user_profiles.email_notifications = TRUE
--              AND auth.users.email IS NOT NULL
--              AND has at least one new approved track from a followed
--              مادح / راوي in the window.
--
-- Empty digests are filtered out at the SQL level — the result set
-- contains only users we should actually email. That replaces the
-- "if (groups.length === 0) skip" gate in the edge function (we still
-- keep that gate as defense-in-depth in case the function is invoked
-- with a stale/wrong query).
--
-- The function reads from `auth.users`, which is normally private. We
-- use SECURITY DEFINER to run as the function owner (postgres) and
-- explicitly qualify `auth.users` in the FROM clause so an empty
-- search_path doesn't matter. Only granted to `service_role` — the
-- edge function calls this with the service-role key.
-- ============================================

CREATE OR REPLACE FUNCTION get_weekly_digest_batch(
  p_since TIMESTAMPTZ
)
RETURNS TABLE (
  user_id      UUID,
  email        TEXT,
  display_name TEXT,
  digest       JSONB
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH artist_with_tracks AS (
    SELECT
      uf.user_id,
      'artist'::text AS target_type,
      ar.id          AS target_id,
      ar.name        AS target_name,
      ar.image_url   AS target_image_url,
      t.id           AS track_id,
      t.title        AS track_title,
      t.created_at   AS track_created_at
    FROM user_follows uf
    JOIN artists ar ON ar.id = uf.target_id
    JOIN tracks  t  ON t.artist_id = ar.id
    WHERE uf.target_type = 'artist'
      AND ar.status      = 'approved'
      AND t.status       = 'approved'
      AND t.created_at  >= p_since
  ),
  author_with_tracks AS (
    SELECT
      uf.user_id,
      'author'::text AS target_type,
      au.id          AS target_id,
      au.name        AS target_name,
      au.image_url   AS target_image_url,
      t.id           AS track_id,
      t.title        AS track_title,
      t.created_at   AS track_created_at
    FROM user_follows uf
    JOIN authors au ON au.id = uf.target_id
    JOIN tracks  t  ON t.author_id = au.id
    WHERE uf.target_type = 'author'
      AND au.status      = 'approved'
      AND t.status       = 'approved'
      AND t.created_at  >= p_since
  ),
  union_all AS (
    SELECT * FROM artist_with_tracks
    UNION ALL
    SELECT * FROM author_with_tracks
  ),
  -- Group track rows up by (user, target) → one row per followed person.
  per_target AS (
    SELECT
      user_id,
      target_type,
      target_id,
      target_name,
      target_image_url,
      jsonb_agg(
        jsonb_build_object(
          'id',         track_id,
          'title',      track_title,
          'created_at', track_created_at
        )
        ORDER BY track_created_at DESC
      ) AS tracks
    FROM union_all
    GROUP BY user_id, target_type, target_id, target_name, target_image_url
  ),
  -- Group again by user → one row per user with the full ordered group list.
  per_user AS (
    SELECT
      user_id,
      jsonb_agg(
        jsonb_build_object(
          'type',      target_type,
          'id',        target_id,
          'name',      target_name,
          'image_url', target_image_url,
          'tracks',    tracks
        )
        ORDER BY target_name
      ) AS digest
    FROM per_target
    GROUP BY user_id
  )
  -- Final join: only users who opted in AND have an email on file.
  SELECT
    pu.user_id,
    u.email,
    up.display_name,
    pu.digest
  FROM per_user pu
  JOIN auth.users     u  ON u.id  = pu.user_id
  JOIN public.user_profiles up ON up.id = pu.user_id
  WHERE up.email_notifications = TRUE
    AND u.email IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION get_weekly_digest_batch(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_weekly_digest_batch(TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION get_weekly_digest_batch(TIMESTAMPTZ) IS
  'Returns one row per eligible user with their digest as JSONB. Filters '
  'out users who opted out, lack an email on auth.users, or have no new '
  'tracks across their مادح/راوي follows. Used by the weekly_digest edge '
  'function to collapse N RPCs into one.';

-- ============================================
-- Single-user preview helper
-- ============================================
-- Returns ONE user's digest as JSONB array. Empty array `[]` means: no
-- email would be sent for this user this week. Used for admin previews
-- and debugging from the SQL editor.

CREATE OR REPLACE FUNCTION get_weekly_digest(
  p_user_id UUID,
  p_since   TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH artist_with_tracks AS (
    SELECT
      'artist'::text AS target_type,
      ar.id          AS target_id,
      ar.name        AS target_name,
      ar.image_url   AS target_image_url,
      t.id           AS track_id,
      t.title        AS track_title,
      t.created_at   AS track_created_at
    FROM user_follows uf
    JOIN artists ar ON ar.id = uf.target_id
    JOIN tracks  t  ON t.artist_id = ar.id
    WHERE uf.user_id     = p_user_id
      AND uf.target_type = 'artist'
      AND ar.status      = 'approved'
      AND t.status       = 'approved'
      AND t.created_at  >= p_since
  ),
  author_with_tracks AS (
    SELECT
      'author'::text AS target_type,
      au.id          AS target_id,
      au.name        AS target_name,
      au.image_url   AS target_image_url,
      t.id           AS track_id,
      t.title        AS track_title,
      t.created_at   AS track_created_at
    FROM user_follows uf
    JOIN authors au ON au.id = uf.target_id
    JOIN tracks  t  ON t.author_id = au.id
    WHERE uf.user_id     = p_user_id
      AND uf.target_type = 'author'
      AND au.status      = 'approved'
      AND t.status       = 'approved'
      AND t.created_at  >= p_since
  ),
  union_all AS (
    SELECT * FROM artist_with_tracks
    UNION ALL
    SELECT * FROM author_with_tracks
  ),
  grouped AS (
    SELECT
      target_type,
      target_id,
      target_name,
      target_image_url,
      jsonb_agg(
        jsonb_build_object(
          'id',         track_id,
          'title',      track_title,
          'created_at', track_created_at
        )
        ORDER BY track_created_at DESC
      ) AS tracks
    FROM union_all
    GROUP BY target_type, target_id, target_name, target_image_url
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'type',       target_type,
        'id',         target_id,
        'name',       target_name,
        'image_url',  target_image_url,
        'tracks',     tracks
      )
      ORDER BY target_name
    ),
    '[]'::jsonb
  )
  FROM grouped;
$$;

GRANT EXECUTE ON FUNCTION get_weekly_digest(UUID, TIMESTAMPTZ)
  TO authenticated, service_role;

COMMENT ON FUNCTION get_weekly_digest(UUID, TIMESTAMPTZ) IS
  'Returns the Friday-morning digest payload for ONE user as JSONB array '
  'of { type, id, name, image_url, tracks: [{id,title,created_at}] }. '
  'Empty array `[]` means: do not send a digest to this user this week. '
  'Used for admin previews; the edge function uses get_weekly_digest_batch.';
