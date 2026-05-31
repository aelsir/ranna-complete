CREATE TABLE artists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  status text DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  bio text,
  image_url text,
  birth_year integer,
  death_year integer,
  is_verified boolean DEFAULT false,
  tariqa_id uuid,
  thumbnail_url text
);
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

CREATE TABLE authors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  status text DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  bio text,
  image_url text,
  birth_year integer,
  death_year integer,
  thumbnail_url text
);
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

CREATE TABLE collection_items (
  collection_id uuid NOT NULL,
  track_id uuid NOT NULL,
  position integer DEFAULT 0,
  added_at timestamp with time zone DEFAULT now()
);
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE collections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE TABLE download_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL,
  user_id uuid,
  device_type text,
  downloaded_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE download_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE funun (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE funun ENABLE ROW LEVEL SECURITY;

CREATE TABLE hero_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  link_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE hero_images ENABLE ROW LEVEL SECURITY;

CREATE TABLE lyrics_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  track_id uuid NOT NULL,
  play_id uuid,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  device_type text
);
ALTER TABLE lyrics_views ENABLE ROW LEVEL SECURITY;

CREATE TABLE tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  madih text NOT NULL,
  writer text,
  audio_url text,
  image_url text,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending'::text,
  artist_id uuid,
  author_id uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  source_url text,
  lyrics text,
  recording_place text,
  tariqa_id uuid,
  fan_id uuid,
  play_count integer DEFAULT 0,
  duration_seconds integer,
  is_featured boolean DEFAULT false,
  needs_processing boolean DEFAULT false,
  file_size_bytes bigint,
  thumbnail_url text,
  content_type text DEFAULT 'madha'::text,
  download_count integer DEFAULT 0
);
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE TABLE turuq (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE turuq ENABLE ROW LEVEL SECURITY;

CREATE TABLE user_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  track_id uuid,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE TABLE user_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE TABLE user_plays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  track_id uuid,
  played_at timestamp with time zone DEFAULT now(),
  duration_seconds integer,
  completed boolean DEFAULT false,
  device_type text
);
ALTER TABLE user_plays ENABLE ROW LEVEL SECURITY;

CREATE TABLE user_profiles (
  id uuid NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  country text DEFAULT 'السودان'::text,
  city text,
  tariqa_id uuid,
  email_notifications boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  last_active_at timestamp with time zone,
  push_notifications boolean NOT NULL DEFAULT true,
  is_internal boolean NOT NULL DEFAULT false
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  role text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE artists ADD CONSTRAINT artists_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE artists ADD CONSTRAINT artists_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE artists ADD CONSTRAINT madiheen_name_key UNIQUE (name);

ALTER TABLE artists ADD CONSTRAINT madiheen_pkey PRIMARY KEY (id);

ALTER TABLE artists ADD CONSTRAINT madiheen_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE artists ADD CONSTRAINT madiheen_tariqa_id_fkey FOREIGN KEY (tariqa_id) REFERENCES turuq(id) ON DELETE SET NULL;

ALTER TABLE authors ADD CONSTRAINT authors_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE authors ADD CONSTRAINT authors_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE authors ADD CONSTRAINT ruwat_name_key UNIQUE (name);

ALTER TABLE authors ADD CONSTRAINT ruwat_pkey PRIMARY KEY (id);

ALTER TABLE authors ADD CONSTRAINT ruwat_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE collection_items ADD CONSTRAINT collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE;

ALTER TABLE collection_items ADD CONSTRAINT collection_items_collection_position_unique UNIQUE (collection_id, "position") DEFERRABLE;

ALTER TABLE collection_items ADD CONSTRAINT collection_items_madha_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE collection_items ADD CONSTRAINT collection_items_pkey PRIMARY KEY (collection_id, track_id);

ALTER TABLE collections ADD CONSTRAINT collections_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE collections ADD CONSTRAINT collections_pkey PRIMARY KEY (id);

ALTER TABLE download_events ADD CONSTRAINT download_events_pkey PRIMARY KEY (id);

ALTER TABLE download_events ADD CONSTRAINT download_events_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE download_events ADD CONSTRAINT download_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE funun ADD CONSTRAINT funun_name_key UNIQUE (name);

ALTER TABLE funun ADD CONSTRAINT funun_pkey PRIMARY KEY (id);

ALTER TABLE hero_images ADD CONSTRAINT hero_images_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE hero_images ADD CONSTRAINT hero_images_pkey PRIMARY KEY (id);

ALTER TABLE lyrics_views ADD CONSTRAINT lyrics_views_pkey PRIMARY KEY (id);

ALTER TABLE lyrics_views ADD CONSTRAINT lyrics_views_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE lyrics_views ADD CONSTRAINT lyrics_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE tracks ADD CONSTRAINT madha_fan_id_fkey FOREIGN KEY (fan_id) REFERENCES funun(id) ON DELETE SET NULL;

ALTER TABLE tracks ADD CONSTRAINT madha_madih_id_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL;

ALTER TABLE tracks ADD CONSTRAINT madha_pkey PRIMARY KEY (id);

ALTER TABLE tracks ADD CONSTRAINT madha_rawi_id_fkey FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL;

ALTER TABLE tracks ADD CONSTRAINT madha_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE tracks ADD CONSTRAINT madha_tariqa_id_fkey FOREIGN KEY (tariqa_id) REFERENCES turuq(id) ON DELETE SET NULL;

ALTER TABLE tracks ADD CONSTRAINT madha_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE tracks ADD CONSTRAINT tracks_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE turuq ADD CONSTRAINT turuq_name_key UNIQUE (name);

ALTER TABLE turuq ADD CONSTRAINT turuq_pkey PRIMARY KEY (id);

ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_madha_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);

ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_user_id_madha_id_key UNIQUE (user_id, track_id);

ALTER TABLE user_follows ADD CONSTRAINT user_follows_pkey PRIMARY KEY (id);

ALTER TABLE user_follows ADD CONSTRAINT user_follows_target_type_check CHECK ((target_type = ANY (ARRAY['artist'::text, 'author'::text, 'tariqa'::text, 'fan'::text])));

ALTER TABLE user_follows ADD CONSTRAINT user_follows_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_follows ADD CONSTRAINT user_follows_user_id_target_type_target_id_key UNIQUE (user_id, target_type, target_id);

ALTER TABLE user_plays ADD CONSTRAINT user_plays_madha_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE user_plays ADD CONSTRAINT user_plays_pkey PRIMARY KEY (id);

ALTER TABLE user_plays ADD CONSTRAINT user_plays_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);

ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_tariqa_id_fkey FOREIGN KEY (tariqa_id) REFERENCES turuq(id);

ALTER TABLE user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['superuser'::text, 'admin'::text, 'user'::text])));

ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

CREATE INDEX hero_images_active_order_idx ON public.hero_images USING btree (is_active, display_order) WHERE (is_active = true);

CREATE INDEX idx_collection_items_collection ON public.collection_items USING btree (collection_id);

CREATE INDEX idx_collections_active ON public.collections USING btree (is_active, display_order);

CREATE INDEX idx_download_events_downloaded_at ON public.download_events USING btree (downloaded_at DESC);

CREATE INDEX idx_download_events_track ON public.download_events USING btree (track_id);

CREATE INDEX idx_download_events_user ON public.download_events USING btree (user_id);

CREATE INDEX idx_madha_fan ON public.tracks USING btree (fan_id);

CREATE INDEX idx_madha_featured ON public.tracks USING btree (is_featured);

CREATE INDEX idx_madha_madih_id ON public.tracks USING btree (artist_id);

CREATE INDEX idx_madha_needs_processing ON public.tracks USING btree (needs_processing) WHERE (needs_processing = true);

CREATE INDEX idx_madha_rawi_id ON public.tracks USING btree (author_id);

CREATE INDEX idx_madha_tariqa ON public.tracks USING btree (tariqa_id);

CREATE INDEX idx_madiheen_name ON public.artists USING btree (name);

CREATE INDEX idx_madiheen_tariqa ON public.artists USING btree (tariqa_id);

CREATE INDEX idx_ruwat_name ON public.authors USING btree (name);

CREATE INDEX idx_user_favorites_user ON public.user_favorites USING btree (user_id);

CREATE INDEX idx_user_follows_target ON public.user_follows USING btree (target_type, target_id);

CREATE INDEX idx_user_follows_user ON public.user_follows USING btree (user_id, target_type);

CREATE INDEX idx_user_plays_madha ON public.user_plays USING btree (track_id);

CREATE INDEX idx_user_plays_user ON public.user_plays USING btree (user_id);

CREATE INDEX idx_user_profiles_is_internal ON public.user_profiles USING btree (is_internal) WHERE (is_internal = true);

CREATE INDEX lyrics_views_play_id_idx ON public.lyrics_views USING btree (play_id) WHERE (play_id IS NOT NULL);

CREATE INDEX lyrics_views_track_id_idx ON public.lyrics_views USING btree (track_id);

CREATE INDEX lyrics_views_user_id_idx ON public.lyrics_views USING btree (user_id) WHERE (user_id IS NOT NULL);

CREATE INDEX lyrics_views_viewed_at_idx ON public.lyrics_views USING btree (viewed_at DESC);

CREATE OR REPLACE VIEW madha AS  SELECT id,
    title,
    madih,
    writer,
    audio_url,
    image_url,
    artist_id AS madih_id,
    author_id AS rawi_id,
    user_id,
    status,
    needs_processing,
    rejection_reason,
    reviewed_by,
    reviewed_at,
    source_url,
    recording_place,
    tariqa_id,
    fan_id,
    play_count,
    duration_seconds,
    is_featured,
    lyrics,
    created_at,
    updated_at,
    file_size_bytes,
    thumbnail_url,
    content_type,
    download_count
   FROM tracks;

CREATE OR REPLACE VIEW madiheen AS  SELECT id,
    name,
    created_at,
    created_by,
    status,
    reviewed_by,
    reviewed_at,
    bio,
    image_url,
    birth_year,
    death_year,
    is_verified,
    tariqa_id
   FROM artists;

CREATE OR REPLACE VIEW ruwat AS  SELECT id,
    name,
    created_at,
    created_by,
    status,
    reviewed_by,
    reviewed_at,
    bio,
    image_url,
    birth_year,
    death_year
   FROM authors;

CREATE OR REPLACE VIEW v_artists AS  SELECT a.id,
    a.name,
    a.created_at,
    a.created_by,
    a.status,
    a.reviewed_by,
    a.reviewed_at,
    a.bio,
    a.image_url,
    a.birth_year,
    a.death_year,
    a.is_verified,
    a.tariqa_id,
    a.thumbnail_url,
    COALESCE(tc.track_count, 0::bigint)::integer AS track_count,
    COALESCE(rp.recent_plays, 0::bigint)::integer AS recent_play_count,
    COALESCE(rp.recent_completed, 0::bigint)::integer AS recent_completed_plays
   FROM artists a
     LEFT JOIN ( SELECT tracks.artist_id,
            count(*) AS track_count
           FROM tracks
          WHERE tracks.status = 'approved'::text
          GROUP BY tracks.artist_id) tc ON tc.artist_id = a.id
     LEFT JOIN ( SELECT t.artist_id,
            count(*) AS recent_plays,
            count(*) FILTER (WHERE up.completed) AS recent_completed
           FROM v_user_plays_external up
             JOIN tracks t ON t.id = up.track_id
          WHERE t.status = 'approved'::text AND t.artist_id IS NOT NULL AND up.played_at >= (now() - '30 days'::interval)
          GROUP BY t.artist_id) rp ON rp.artist_id = a.id
  WHERE a.status = 'approved'::text;

CREATE OR REPLACE VIEW v_collections AS  SELECT c.id,
    c.name,
    c.name_en,
    c.description,
    c.image_url,
    c.is_active,
    c.display_order,
    c.created_at,
    c.created_by,
    COALESCE(ic.item_count, 0::bigint)::integer AS item_count
   FROM collections c
     LEFT JOIN ( SELECT collection_items.collection_id,
            count(*) AS item_count
           FROM collection_items
          GROUP BY collection_items.collection_id) ic ON ic.collection_id = c.id
  WHERE c.is_active = true;

CREATE OR REPLACE VIEW v_download_events_external AS  SELECT de.id,
    de.track_id,
    de.user_id,
    de.device_type,
    de.downloaded_at
   FROM download_events de
     LEFT JOIN user_profiles prof ON prof.id = de.user_id
  WHERE prof.is_internal IS NOT TRUE;

CREATE OR REPLACE VIEW v_follower_counts AS  SELECT uf.target_type,
    uf.target_id,
    count(*) AS follower_count
   FROM user_follows uf
     LEFT JOIN user_profiles up ON up.id = uf.user_id
  WHERE up.is_internal IS NOT TRUE
  GROUP BY uf.target_type, uf.target_id;

CREATE OR REPLACE VIEW v_narrators AS  SELECT au.id,
    au.name,
    au.created_at,
    au.created_by,
    au.status,
    au.reviewed_by,
    au.reviewed_at,
    au.bio,
    au.image_url,
    au.birth_year,
    au.death_year,
    au.thumbnail_url,
    COALESCE(tc.track_count, 0::bigint)::integer AS track_count,
    COALESCE(rp.recent_plays, 0::bigint)::integer AS recent_play_count,
    COALESCE(rp.recent_completed, 0::bigint)::integer AS recent_completed_plays
   FROM authors au
     LEFT JOIN ( SELECT tracks.author_id,
            count(*) AS track_count
           FROM tracks
          WHERE tracks.status = 'approved'::text
          GROUP BY tracks.author_id) tc ON tc.author_id = au.id
     LEFT JOIN ( SELECT t.author_id,
            count(*) AS recent_plays,
            count(*) FILTER (WHERE up.completed) AS recent_completed
           FROM v_user_plays_external up
             JOIN tracks t ON t.id = up.track_id
          WHERE t.status = 'approved'::text AND t.author_id IS NOT NULL AND up.played_at >= (now() - '30 days'::interval)
          GROUP BY t.author_id) rp ON rp.author_id = au.id
  WHERE au.status = 'approved'::text;

CREATE OR REPLACE VIEW v_recent_listens AS  SELECT DISTINCT ON (user_id, track_id) user_id,
    track_id,
    played_at AS listened_at
   FROM user_plays
  WHERE user_id IS NOT NULL
  ORDER BY user_id, track_id, played_at DESC;

CREATE OR REPLACE VIEW v_tracks AS  SELECT t.id,
    t.title,
    t.madih,
    t.writer,
    t.audio_url,
    t.image_url,
    t.artist_id AS madih_id,
    t.author_id AS rawi_id,
    t.user_id,
    t.status,
    t.needs_processing,
    t.rejection_reason,
    t.reviewed_by,
    t.reviewed_at,
    t.source_url,
    t.recording_place,
    t.tariqa_id,
    t.fan_id,
    t.play_count,
    t.duration_seconds,
    t.is_featured,
    t.lyrics,
    t.created_at,
    t.updated_at,
    t.file_size_bytes,
    t.thumbnail_url,
    t.content_type,
        CASE
            WHEN a.id IS NOT NULL THEN json_build_object('id', a.id, 'name', a.name, 'image_url', a.image_url, 'bio', a.bio, 'birth_year', a.birth_year, 'death_year', a.death_year, 'is_verified', a.is_verified, 'tariqa_id', a.tariqa_id, 'status', a.status, 'created_at', a.created_at)
            ELSE NULL::json
        END AS madiheen,
        CASE
            WHEN au.id IS NOT NULL THEN json_build_object('id', au.id, 'name', au.name, 'image_url', au.image_url, 'bio', au.bio, 'birth_year', au.birth_year, 'death_year', au.death_year, 'status', au.status, 'created_at', au.created_at)
            ELSE NULL::json
        END AS ruwat,
        CASE
            WHEN tq.id IS NOT NULL THEN json_build_object('id', tq.id, 'name', tq.name, 'description', tq.description)
            ELSE NULL::json
        END AS turuq,
        CASE
            WHEN f.id IS NOT NULL THEN json_build_object('id', f.id, 'name', f.name, 'description', f.description)
            ELSE NULL::json
        END AS funun
   FROM tracks t
     LEFT JOIN artists a ON t.artist_id = a.id
     LEFT JOIN authors au ON t.author_id = au.id
     LEFT JOIN turuq tq ON t.tariqa_id = tq.id
     LEFT JOIN funun f ON t.fan_id = f.id
  WHERE t.status = 'approved'::text;

CREATE OR REPLACE VIEW v_tracks_admin AS  SELECT t.id,
    t.title,
    t.madih,
    t.writer,
    t.audio_url,
    t.image_url,
    t.artist_id AS madih_id,
    t.author_id AS rawi_id,
    t.user_id,
    t.status,
    t.needs_processing,
    t.rejection_reason,
    t.reviewed_by,
    t.reviewed_at,
    t.source_url,
    t.recording_place,
    t.tariqa_id,
    t.fan_id,
    t.play_count,
    t.duration_seconds,
    t.is_featured,
    t.lyrics,
    t.created_at,
    t.updated_at,
    t.file_size_bytes,
    t.thumbnail_url,
    t.content_type,
        CASE
            WHEN a.id IS NOT NULL THEN json_build_object('id', a.id, 'name', a.name, 'image_url', a.image_url, 'bio', a.bio, 'is_verified', a.is_verified, 'status', a.status, 'created_at', a.created_at)
            ELSE NULL::json
        END AS madiheen,
        CASE
            WHEN au.id IS NOT NULL THEN json_build_object('id', au.id, 'name', au.name, 'image_url', au.image_url, 'status', au.status, 'created_at', au.created_at)
            ELSE NULL::json
        END AS ruwat,
        CASE
            WHEN tq.id IS NOT NULL THEN json_build_object('id', tq.id, 'name', tq.name, 'description', tq.description)
            ELSE NULL::json
        END AS turuq,
        CASE
            WHEN f.id IS NOT NULL THEN json_build_object('id', f.id, 'name', f.name, 'description', f.description)
            ELSE NULL::json
        END AS funun
   FROM tracks t
     LEFT JOIN artists a ON t.artist_id = a.id
     LEFT JOIN authors au ON t.author_id = au.id
     LEFT JOIN turuq tq ON t.tariqa_id = tq.id
     LEFT JOIN funun f ON t.fan_id = f.id;

CREATE OR REPLACE VIEW v_user_favorites_external AS  SELECT uf.id,
    uf.user_id,
    uf.track_id,
    uf.created_at
   FROM user_favorites uf
     LEFT JOIN user_profiles prof ON prof.id = uf.user_id
  WHERE prof.is_internal IS NOT TRUE;

CREATE OR REPLACE VIEW v_user_plays_external AS  SELECT up.id,
    up.user_id,
    up.track_id,
    up.played_at,
    up.duration_seconds,
    up.completed,
    up.device_type
   FROM user_plays up
     LEFT JOIN user_profiles prof ON prof.id = up.user_id
  WHERE prof.is_internal IS NOT TRUE;

CREATE OR REPLACE FUNCTION public.get_artist_profile(p_artist_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    v_artist JSON;
    v_artist_tracks JSON;
BEGIN
    SELECT row_to_json(a) INTO v_artist
    FROM v_artists a WHERE a.id = p_artist_id;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_artist_tracks
    FROM (
        SELECT * FROM v_tracks vt
        WHERE vt.madih_id = p_artist_id
        ORDER BY created_at DESC
    ) t;

    result := json_build_object(
        'artist', v_artist,
        'tracks', v_artist_tracks
    );

    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_collection_tracks(p_collection_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.position), '[]'::json) INTO result
    FROM (
        SELECT ci.position, vt.*
        FROM collection_items ci
        INNER JOIN v_tracks vt ON vt.id = ci.track_id
        WHERE ci.collection_id = p_collection_id
    ) t;

    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_completion_stats(p_tz text DEFAULT 'Africa/Khartoum'::text, p_trend_days integer DEFAULT 30, p_window_days integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    WITH track_stats AS (
        SELECT
            p.track_id,
            COUNT(*) FILTER (WHERE p.completed) AS completed_plays,
            COUNT(*)                            AS total_plays
        FROM v_user_plays_external p
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

    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    bucketed AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE       AS day,
            COUNT(*)                                  AS plays,
            COUNT(*) FILTER (WHERE completed)         AS completed
        FROM v_user_plays_external
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

    WITH play_depth AS (
        SELECT
            p.completed,
            CASE
                WHEN t.duration_seconds IS NULL OR t.duration_seconds <= 0 THEN NULL
                WHEN p.completed THEN 1.0
                ELSE LEAST(1.0, GREATEST(0.0,
                    COALESCE(p.duration_seconds, 0)::NUMERIC / t.duration_seconds))
            END AS ratio
        FROM v_user_plays_external p
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
        FROM v_user_plays_external p
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_download_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT json_build_object(
        'total_downloads', (SELECT COUNT(*) FROM download_events),
        'unique_tracks_downloaded', (SELECT COUNT(DISTINCT track_id) FROM download_events),
        'unique_users_downloaded', (SELECT COUNT(DISTINCT user_id) FROM download_events WHERE user_id IS NOT NULL),
        'downloads_last_7_days', (SELECT COUNT(*) FROM download_events WHERE downloaded_at >= NOW() - INTERVAL '7 days'),
        'downloads_last_30_days', (SELECT COUNT(*) FROM download_events WHERE downloaded_at >= NOW() - INTERVAL '30 days'),
        'top_downloaded_tracks', (
            SELECT json_agg(row_to_json(t))
            FROM (
                SELECT
                    tr.id,
                    tr.title,
                    COUNT(de.id) AS download_count
                FROM download_events de
                JOIN tracks tr ON tr.id = de.track_id
                GROUP BY tr.id, tr.title
                ORDER BY download_count DESC
                LIMIT 10
            ) t
        ),
        'downloads_by_device', (
            SELECT json_agg(row_to_json(t))
            FROM (
                SELECT
                    COALESCE(device_type, 'unknown') AS device,
                    COUNT(*) AS count
                FROM download_events
                GROUP BY device_type
                ORDER BY count DESC
            ) t
        )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.get_home_data(p_limit integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    v_trending JSON;
    v_featured JSON;
    v_recent JSON;
    v_artists JSON;
    v_narrators JSON;
    v_collections JSON;
    v_total_tracks INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_tracks FROM tracks WHERE status = 'approved';

    -- 14-day window (was 7). Ordered by completed plays per migration 048.
    WITH trending_ids AS (
        SELECT id FROM get_trending_tracks(14, p_limit)
    )
    SELECT COALESCE(json_agg(row_to_json(vt)), '[]'::json) INTO v_trending
    FROM v_tracks vt
    WHERE vt.id IN (SELECT id FROM trending_ids);

    -- Fallback if no plays in the window: highest-play-count overall.
    -- Same behavior as before — just a safety net for empty installs.
    IF v_trending IS NULL OR v_trending::text = '[]' THEN
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_trending
        FROM (
            SELECT * FROM v_tracks ORDER BY play_count DESC LIMIT p_limit
        ) t;
    END IF;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_featured
    FROM (
        SELECT * FROM v_tracks WHERE is_featured = true
        ORDER BY created_at DESC LIMIT p_limit
    ) t;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_recent
    FROM (
        SELECT * FROM v_tracks ORDER BY created_at DESC LIMIT p_limit
    ) t;

    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_artists
    FROM (
        SELECT * FROM v_artists ORDER BY track_count DESC, name ASC LIMIT 20
    ) a;

    SELECT COALESCE(json_agg(row_to_json(n)), '[]'::json) INTO v_narrators
    FROM (
        SELECT * FROM v_narrators ORDER BY track_count DESC, name ASC LIMIT 20
    ) n;

    SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) INTO v_collections
    FROM (
        SELECT * FROM v_collections ORDER BY display_order DESC LIMIT 20
    ) c;

    result := json_build_object(
        'total_tracks', v_total_tracks,
        'trending',     v_trending,
        'featured',     v_featured,
        'recent',       v_recent,
        'artists',      v_artists,
        'narrators',    v_narrators,
        'collections',  v_collections
    );

    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_lyrics_stats(p_tz text DEFAULT 'Africa/Khartoum'::text, p_trend_days integer DEFAULT 30, p_window_days integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (
            WHERE t.lyrics IS NOT NULL AND t.lyrics <> ''
        )::BIGINT
    INTO v_total_plays, v_plays_with_lyrics
    FROM v_user_plays_external p
    JOIN tracks t ON t.id = p.track_id
    WHERE v_window_since IS NULL OR p.played_at >= v_window_since;

    SELECT
        COUNT(*)::BIGINT,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::INT
    INTO v_total_lyric_views, v_unique_viewers
    FROM lyrics_views
    WHERE v_window_since IS NULL OR viewed_at >= v_window_since;

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
        FROM v_user_plays_external p
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT get_user_role(auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.get_narrator_profile(p_narrator_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    v_narrator JSON;
    v_narrator_tracks JSON;
BEGIN
    SELECT row_to_json(n) INTO v_narrator
    FROM v_narrators n WHERE n.id = p_narrator_id;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_narrator_tracks
    FROM (
        SELECT * FROM v_tracks vt
        WHERE vt.rawi_id = p_narrator_id
        ORDER BY created_at DESC
    ) t;

    result := json_build_object(
        'narrator', v_narrator,
        'tracks', v_narrator_tracks
    );

    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_stats_overview(p_tz text DEFAULT 'Africa/Khartoum'::text, p_trend_days integer DEFAULT 14, p_heatmap_weeks integer DEFAULT 4, p_window_days integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    FROM v_user_plays_external
    WHERE v_window_since IS NULL OR played_at >= v_window_since;

    SELECT COUNT(*)::BIGINT
    INTO v_total_favorites
    FROM user_favorites
    WHERE v_window_since IS NULL OR created_at >= v_window_since;

    SELECT COUNT(*)::BIGINT INTO v_total_accounts FROM auth.users;

    SELECT COUNT(DISTINCT user_id) INTO v_played_accounts
    FROM v_user_plays_external
    WHERE user_id IS NOT NULL;

    SELECT COUNT(*)::BIGINT
    INTO v_registered_accts
    FROM auth.users
    WHERE email IS NOT NULL AND email <> '';

    -- plays + minutes trend
    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    bucketed AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE AS day,
            COUNT(*)                            AS plays,
            COALESCE(SUM(duration_seconds), 0)  AS seconds
        FROM v_user_plays_external
        WHERE (played_at AT TIME ZONE p_tz)::DATE BETWEEN v_trend_start AND v_today_local
        GROUP BY 1
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

    -- heatmap
    WITH cells AS (
        SELECT
            EXTRACT(DOW  FROM played_at AT TIME ZONE p_tz)::INT AS dow,
            EXTRACT(HOUR FROM played_at AT TIME ZONE p_tz)::INT AS hour,
            COUNT(*)::INT                                       AS plays
        FROM v_user_plays_external
        WHERE played_at >= v_heatmap_since
        GROUP BY dow, hour
    )
    SELECT json_agg(json_build_object('dow', dow, 'hour', hour, 'count', plays))
    INTO v_heatmap
    FROM cells;

    -- DAU (registered, internal-excluded)
    WITH days AS (
        SELECT generate_series(v_trend_start, v_today_local, '1 day'::INTERVAL)::DATE AS day
    ),
    dau_per_day AS (
        SELECT
            (played_at AT TIME ZONE p_tz)::DATE AS day,
            COUNT(DISTINCT user_id)::INT       AS users
        FROM v_user_plays_external
        WHERE user_id IS NOT NULL
          AND (played_at AT TIME ZONE p_tz)::DATE BETWEEN v_trend_start AND v_today_local
        GROUP BY 1
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_trending_tracks(days_window integer DEFAULT 7, max_results integer DEFAULT 10)
 RETURNS SETOF tracks
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH agg AS (
        SELECT
            track_id,
            COUNT(*)                          AS plays,
            COUNT(*) FILTER (WHERE completed) AS completed_plays
        FROM v_user_plays_external
        WHERE played_at >= NOW() - (days_window || ' days')::INTERVAL
        GROUP BY track_id
        HAVING COUNT(*) >= 3
    )
    SELECT t.*
    FROM tracks t
    INNER JOIN agg ON agg.track_id = t.id
    WHERE t.status = 'approved'
    ORDER BY
        agg.completed_plays DESC,
        -- Completion rate (with safe divisor) — secondary signal so two
        -- tracks with the same completed count get sorted by how much of
        -- their audience actually stuck with them.
        (agg.completed_plays::NUMERIC / NULLIF(agg.plays, 0)) DESC NULLS LAST,
        -- Final tiebreak: raw play count, so a 5-finished-of-10 beats a
        -- 5-finished-of-6 if both win on the previous tiebreaker (won't
        -- happen mathematically, but kept for determinism).
        agg.plays DESC
    LIMIT max_results;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT role FROM user_roles WHERE user_id = check_user_id LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_weekly_digest(p_user_id uuid, p_since timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_weekly_digest_batch(p_since timestamp with time zone)
 RETURNS TABLE(user_id uuid, email text, display_name text, digest jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.user_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_download_count(p_track_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    UPDATE tracks
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = p_track_id;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_play_count(p_madha_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    UPDATE tracks
    SET play_count = play_count + 1
    WHERE id = p_madha_id;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_or_superuser()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT get_user_role(auth.uid()) IN ('admin', 'superuser');
$function$
;

CREATE OR REPLACE FUNCTION public.madha_alias_delete_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM tracks WHERE id = OLD.id;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.madha_alias_insert_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO tracks (
        id, title, madih, writer, audio_url, image_url,
        artist_id, author_id,
        user_id, status, needs_processing, rejection_reason,
        reviewed_by, reviewed_at, source_url,
        recording_place, tariqa_id, fan_id,
        play_count, duration_seconds, is_featured,
        lyrics, created_at, updated_at,
        file_size_bytes, thumbnail_url, content_type,
        download_count
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.title, NEW.madih, NEW.writer, NEW.audio_url, NEW.image_url,
        NEW.madih_id, NEW.rawi_id,
        NEW.user_id, COALESCE(NEW.status, 'pending'), NEW.needs_processing, NEW.rejection_reason,
        NEW.reviewed_by, NEW.reviewed_at, NEW.source_url,
        NEW.recording_place, NEW.tariqa_id, NEW.fan_id,
        COALESCE(NEW.play_count, 0), NEW.duration_seconds, COALESCE(NEW.is_featured, false),
        NEW.lyrics, COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()),
        NEW.file_size_bytes, NEW.thumbnail_url, COALESCE(NEW.content_type, 'madha'),
        COALESCE(NEW.download_count, 0)
    )
    RETURNING id, title, madih, writer, audio_url, image_url,
        artist_id AS madih_id, author_id AS rawi_id,
        user_id, status, needs_processing, rejection_reason,
        reviewed_by, reviewed_at, source_url,
        recording_place, tariqa_id, fan_id,
        play_count, duration_seconds, is_featured,
        lyrics, created_at, updated_at,
        file_size_bytes, thumbnail_url, content_type,
        download_count
    INTO NEW;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.madha_alias_update_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE tracks SET
        title = NEW.title,
        madih = NEW.madih,
        writer = NEW.writer,
        audio_url = NEW.audio_url,
        image_url = NEW.image_url,
        artist_id = NEW.madih_id,
        author_id = NEW.rawi_id,
        user_id = NEW.user_id,
        status = NEW.status,
        needs_processing = NEW.needs_processing,
        rejection_reason = NEW.rejection_reason,
        reviewed_by = NEW.reviewed_by,
        reviewed_at = NEW.reviewed_at,
        source_url = NEW.source_url,
        recording_place = NEW.recording_place,
        tariqa_id = NEW.tariqa_id,
        fan_id = NEW.fan_id,
        play_count = NEW.play_count,
        duration_seconds = NEW.duration_seconds,
        is_featured = NEW.is_featured,
        lyrics = NEW.lyrics,
        updated_at = NOW(),
        file_size_bytes = NEW.file_size_bytes,
        thumbnail_url = NEW.thumbnail_url,
        content_type = NEW.content_type,
        download_count = NEW.download_count
    WHERE id = OLD.id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.madiheen_alias_delete_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM artists WHERE id = OLD.id;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.madiheen_alias_insert_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO artists (id, name, created_at, created_by, status, reviewed_by, reviewed_at, bio, image_url, birth_year, death_year, is_verified, tariqa_id)
    VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.name,
        COALESCE(NEW.created_at, NOW()),
        NEW.created_by,
        COALESCE(NEW.status, 'pending'),
        NEW.reviewed_by,
        NEW.reviewed_at,
        NEW.bio,
        NEW.image_url,
        NEW.birth_year,
        NEW.death_year,
        COALESCE(NEW.is_verified, false),
        NEW.tariqa_id
    )
    RETURNING id INTO new_id;

    NEW.id := new_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.madiheen_alias_update_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE artists SET
        name = NEW.name, image_url = NEW.image_url, status = NEW.status,
        bio = NEW.bio, birth_year = NEW.birth_year, death_year = NEW.death_year,
        is_verified = NEW.is_verified, tariqa_id = NEW.tariqa_id,
        created_by = NEW.created_by, reviewed_by = NEW.reviewed_by,
        reviewed_at = NEW.reviewed_at
    WHERE id = OLD.id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_arabic(input text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
    SELECT LOWER(TRIM(
        -- Character variant mappings
        TRANSLATE(
            -- Strip tashkeel (diacritics) and tatweel
            REGEXP_REPLACE(
                input,
                '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0640]',
                '',
                'g'
            ),
            -- from chars:  أ      إ      آ      ٱ      ة      ى      ؤ      ئ
            E'\u0623\u0625\u0622\u0671\u0629\u0649\u0624\u0626',
            -- to chars:    ا      ا      ا      ا      ه      ي      و      ي
            E'\u0627\u0627\u0627\u0627\u0647\u064A\u0648\u064A'
        )
    ));
$function$
;

CREATE OR REPLACE FUNCTION public.on_user_plays_insert_increment_play_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_internal BOOLEAN;
BEGIN
    -- Skip if the inserting user is flagged as internal. Anonymous plays
    -- (user_id IS NULL) always count — they're not internal team.
    IF NEW.user_id IS NOT NULL THEN
        SELECT is_internal
        INTO v_is_internal
        FROM user_profiles
        WHERE id = NEW.user_id;

        IF COALESCE(v_is_internal, FALSE) = TRUE THEN
            RETURN NEW;
        END IF;
    END IF;

    UPDATE tracks
    SET play_count = COALESCE(play_count, 0) + 1
    WHERE id = NEW.track_id;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_lyrics_view(p_track_id uuid, p_play_id uuid DEFAULT NULL::uuid, p_device_type text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.ruwat_alias_delete_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM authors WHERE id = OLD.id;
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ruwat_alias_insert_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO authors (id, name, created_at, created_by, status, reviewed_by, reviewed_at, bio, image_url, birth_year, death_year)
    VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.name,
        COALESCE(NEW.created_at, NOW()),
        NEW.created_by,
        COALESCE(NEW.status, 'pending'),
        NEW.reviewed_by,
        NEW.reviewed_at,
        NEW.bio,
        NEW.image_url,
        NEW.birth_year,
        NEW.death_year
    )
    RETURNING id INTO new_id;

    NEW.id := new_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ruwat_alias_update_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE authors SET
        name = NEW.name, image_url = NEW.image_url, status = NEW.status,
        bio = NEW.bio, birth_year = NEW.birth_year, death_year = NEW.death_year,
        created_by = NEW.created_by, reviewed_by = NEW.reviewed_by,
        reviewed_at = NEW.reviewed_at
    WHERE id = OLD.id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_all(p_query text, p_limit integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    v_tracks_result JSON;
    v_lyrics JSON;
    v_artists_result JSON;
    v_narrators_result JSON;
    normalized TEXT;
BEGIN
    normalized := normalize_arabic(p_query);

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tracks_result
    FROM (
        SELECT * FROM v_tracks vt
        WHERE normalize_arabic(vt.title) LIKE '%' || normalized || '%'
           OR normalize_arabic(COALESCE(vt.madih, '')) LIKE '%' || normalized || '%'
           OR normalize_arabic(COALESCE(vt.writer, '')) LIKE '%' || normalized || '%'
        ORDER BY play_count DESC
        LIMIT p_limit
    ) t;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_lyrics
    FROM (
        SELECT * FROM v_tracks vt
        WHERE normalize_arabic(COALESCE(vt.lyrics, '')) LIKE '%' || normalized || '%'
          AND NOT (
              normalize_arabic(vt.title) LIKE '%' || normalized || '%'
              OR normalize_arabic(COALESCE(vt.madih, '')) LIKE '%' || normalized || '%'
              OR normalize_arabic(COALESCE(vt.writer, '')) LIKE '%' || normalized || '%'
          )
        ORDER BY play_count DESC
        LIMIT p_limit
    ) t;

    SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_artists_result
    FROM (
        SELECT * FROM v_artists va
        WHERE normalize_arabic(va.name) LIKE '%' || normalized || '%'
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) a;

    SELECT COALESCE(json_agg(row_to_json(n)), '[]'::json) INTO v_narrators_result
    FROM (
        SELECT * FROM v_narrators vn
        WHERE normalize_arabic(vn.name) LIKE '%' || normalized || '%'
        ORDER BY track_count DESC, name ASC
        LIMIT 20
    ) n;

    result := json_build_object(
        'tracks', v_tracks_result,
        'lyrics', v_lyrics,
        'artists', v_artists_result,
        'narrators', v_narrators_result
    );

    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE TRIGGER madha_alias_delete INSTEAD OF DELETE ON public.madha FOR EACH ROW EXECUTE FUNCTION madha_alias_delete_fn();

CREATE TRIGGER madha_alias_insert INSTEAD OF INSERT ON public.madha FOR EACH ROW EXECUTE FUNCTION madha_alias_insert_fn();

CREATE TRIGGER madha_alias_update INSTEAD OF UPDATE ON public.madha FOR EACH ROW EXECUTE FUNCTION madha_alias_update_fn();

CREATE TRIGGER madha_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER madiheen_alias_delete INSTEAD OF DELETE ON public.madiheen FOR EACH ROW EXECUTE FUNCTION madiheen_alias_delete_fn();

CREATE TRIGGER madiheen_alias_insert INSTEAD OF INSERT ON public.madiheen FOR EACH ROW EXECUTE FUNCTION madiheen_alias_insert_fn();

CREATE TRIGGER madiheen_alias_update INSTEAD OF UPDATE ON public.madiheen FOR EACH ROW EXECUTE FUNCTION madiheen_alias_update_fn();

CREATE TRIGGER ruwat_alias_delete INSTEAD OF DELETE ON public.ruwat FOR EACH ROW EXECUTE FUNCTION ruwat_alias_delete_fn();

CREATE TRIGGER ruwat_alias_insert INSTEAD OF INSERT ON public.ruwat FOR EACH ROW EXECUTE FUNCTION ruwat_alias_insert_fn();

CREATE TRIGGER ruwat_alias_update INSTEAD OF UPDATE ON public.ruwat FOR EACH ROW EXECUTE FUNCTION ruwat_alias_update_fn();

CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_plays_increment_play_count AFTER INSERT ON public.user_plays FOR EACH ROW EXECUTE FUNCTION on_user_plays_insert_increment_play_count();

CREATE POLICY "Admins can delete madiheen" ON artists FOR DELETE TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can delete ruwat" ON authors FOR DELETE TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can manage collection items" ON collection_items FOR ALL TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can manage collections" ON collections FOR ALL TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can manage funun" ON funun FOR ALL TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can manage hero images" ON hero_images FOR ALL TO public USING (is_admin_or_superuser()) WITH CHECK (is_admin_or_superuser());

CREATE POLICY "Admins can manage turuq" ON turuq FOR ALL TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can read lyric views" ON lyrics_views FOR SELECT TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can update madha" ON tracks FOR UPDATE TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can update madiheen" ON artists FOR UPDATE TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can update ruwat" ON authors FOR UPDATE TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can view all download events" ON download_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))));

CREATE POLICY "Admins can view all favorites" ON user_favorites FOR SELECT TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can view all hero images" ON hero_images FOR SELECT TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can view all madha" ON tracks FOR SELECT TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can view all madiheen" ON artists FOR SELECT TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can view all plays" ON user_plays FOR SELECT TO public USING (is_admin_or_superuser());

CREATE POLICY "Admins can view all ruwat" ON authors FOR SELECT TO public USING (is_admin_or_superuser());

CREATE POLICY "Anonymous users can insert download events" ON download_events FOR INSERT TO anon WITH CHECK ((user_id IS NULL));

CREATE POLICY "Anyone can insert plays" ON user_plays FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can record their own lyric views" ON lyrics_views FOR INSERT TO public WITH CHECK (((user_id IS NULL) OR (user_id = auth.uid())));

CREATE POLICY "Anyone can view active collections" ON collections FOR SELECT TO public USING ((is_active = true));

CREATE POLICY "Anyone can view active hero images" ON hero_images FOR SELECT TO public USING ((is_active = true));

CREATE POLICY "Anyone can view approved madha" ON tracks FOR SELECT TO public USING ((status = 'approved'::text));

CREATE POLICY "Anyone can view approved madiheen" ON artists FOR SELECT TO public USING ((status = 'approved'::text));

CREATE POLICY "Anyone can view approved ruwat" ON authors FOR SELECT TO public USING ((status = 'approved'::text));

CREATE POLICY "Anyone can view collection items" ON collection_items FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can view funun" ON funun FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can view profiles" ON user_profiles FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can view turuq" ON turuq FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can add madiheen" ON artists FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can add ruwat" ON authors FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert" ON tracks FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Authenticated users can insert download events" ON download_events FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Owners can view own madha" ON tracks FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND (auth.uid() = user_id)));

CREATE POLICY "Owners can view own madiheen" ON artists FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND (auth.uid() = created_by)));

CREATE POLICY "Owners can view own ruwat" ON authors FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND (auth.uid() = created_by)));

CREATE POLICY "Superusers can manage all roles" ON user_roles FOR ALL TO public USING ((get_user_role(auth.uid()) = 'superuser'::text));

CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT TO public WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can manage own favorites" ON user_favorites FOR ALL TO public USING ((auth.uid() = user_id));

CREATE POLICY "Users can read own role" ON user_roles FOR SELECT TO public USING ((auth.uid() = user_id));

CREATE POLICY "Users can update own madha" ON tracks FOR UPDATE TO public USING ((auth.uid() = user_id));

CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO public USING ((auth.uid() = id));

CREATE POLICY "Users can view own favorites" ON user_favorites FOR SELECT TO public USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own plays" ON user_plays FOR SELECT TO public USING ((auth.uid() = user_id));

CREATE POLICY "Users or admins can delete madha" ON tracks FOR DELETE TO public USING (((auth.uid() = user_id) OR is_admin_or_superuser()));

CREATE POLICY user_follows_self_delete ON user_follows FOR DELETE TO public USING ((auth.uid() = user_id));

CREATE POLICY user_follows_self_insert ON user_follows FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));

CREATE POLICY user_follows_self_select ON user_follows FOR SELECT TO public USING ((auth.uid() = user_id));

GRANT REFERENCES ON artists TO anon;

GRANT TRIGGER ON artists TO anon;

GRANT TRUNCATE ON artists TO anon;

GRANT INSERT ON artists TO anon;

GRANT SELECT ON artists TO anon;

GRANT UPDATE ON artists TO anon;

GRANT DELETE ON artists TO anon;

GRANT INSERT ON artists TO authenticated;

GRANT SELECT ON artists TO authenticated;

GRANT UPDATE ON artists TO authenticated;

GRANT DELETE ON artists TO authenticated;

GRANT TRUNCATE ON artists TO authenticated;

GRANT REFERENCES ON artists TO authenticated;

GRANT TRIGGER ON artists TO authenticated;

GRANT SELECT ON artists TO service_role;

GRANT INSERT ON artists TO service_role;

GRANT UPDATE ON artists TO service_role;

GRANT DELETE ON artists TO service_role;

GRANT TRUNCATE ON artists TO service_role;

GRANT REFERENCES ON artists TO service_role;

GRANT TRIGGER ON artists TO service_role;

GRANT INSERT ON authors TO anon;

GRANT TRIGGER ON authors TO anon;

GRANT SELECT ON authors TO anon;

GRANT UPDATE ON authors TO anon;

GRANT DELETE ON authors TO anon;

GRANT TRUNCATE ON authors TO anon;

GRANT REFERENCES ON authors TO anon;

GRANT TRIGGER ON authors TO authenticated;

GRANT REFERENCES ON authors TO authenticated;

GRANT TRUNCATE ON authors TO authenticated;

GRANT DELETE ON authors TO authenticated;

GRANT UPDATE ON authors TO authenticated;

GRANT SELECT ON authors TO authenticated;

GRANT INSERT ON authors TO authenticated;

GRANT UPDATE ON authors TO service_role;

GRANT TRIGGER ON authors TO service_role;

GRANT REFERENCES ON authors TO service_role;

GRANT TRUNCATE ON authors TO service_role;

GRANT DELETE ON authors TO service_role;

GRANT SELECT ON authors TO service_role;

GRANT INSERT ON authors TO service_role;

GRANT REFERENCES ON collection_items TO anon;

GRANT TRUNCATE ON collection_items TO anon;

GRANT DELETE ON collection_items TO anon;

GRANT UPDATE ON collection_items TO anon;

GRANT SELECT ON collection_items TO anon;

GRANT INSERT ON collection_items TO anon;

GRANT TRIGGER ON collection_items TO anon;

GRANT REFERENCES ON collection_items TO authenticated;

GRANT TRUNCATE ON collection_items TO authenticated;

GRANT DELETE ON collection_items TO authenticated;

GRANT UPDATE ON collection_items TO authenticated;

GRANT SELECT ON collection_items TO authenticated;

GRANT INSERT ON collection_items TO authenticated;

GRANT TRIGGER ON collection_items TO authenticated;

GRANT TRIGGER ON collection_items TO service_role;

GRANT SELECT ON collection_items TO service_role;

GRANT UPDATE ON collection_items TO service_role;

GRANT DELETE ON collection_items TO service_role;

GRANT TRUNCATE ON collection_items TO service_role;

GRANT REFERENCES ON collection_items TO service_role;

GRANT INSERT ON collection_items TO service_role;

GRANT TRIGGER ON collections TO anon;

GRANT INSERT ON collections TO anon;

GRANT SELECT ON collections TO anon;

GRANT UPDATE ON collections TO anon;

GRANT DELETE ON collections TO anon;

GRANT TRUNCATE ON collections TO anon;

GRANT REFERENCES ON collections TO anon;

GRANT INSERT ON collections TO authenticated;

GRANT SELECT ON collections TO authenticated;

GRANT UPDATE ON collections TO authenticated;

GRANT DELETE ON collections TO authenticated;

GRANT TRUNCATE ON collections TO authenticated;

GRANT REFERENCES ON collections TO authenticated;

GRANT TRIGGER ON collections TO authenticated;

GRANT REFERENCES ON collections TO service_role;

GRANT TRUNCATE ON collections TO service_role;

GRANT DELETE ON collections TO service_role;

GRANT UPDATE ON collections TO service_role;

GRANT SELECT ON collections TO service_role;

GRANT INSERT ON collections TO service_role;

GRANT TRIGGER ON collections TO service_role;

GRANT TRIGGER ON download_events TO anon;

GRANT TRUNCATE ON download_events TO anon;

GRANT DELETE ON download_events TO anon;

GRANT UPDATE ON download_events TO anon;

GRANT SELECT ON download_events TO anon;

GRANT INSERT ON download_events TO anon;

GRANT REFERENCES ON download_events TO anon;

GRANT TRIGGER ON download_events TO authenticated;

GRANT INSERT ON download_events TO authenticated;

GRANT SELECT ON download_events TO authenticated;

GRANT UPDATE ON download_events TO authenticated;

GRANT DELETE ON download_events TO authenticated;

GRANT TRUNCATE ON download_events TO authenticated;

GRANT REFERENCES ON download_events TO authenticated;

GRANT TRIGGER ON download_events TO service_role;

GRANT INSERT ON download_events TO service_role;

GRANT SELECT ON download_events TO service_role;

GRANT UPDATE ON download_events TO service_role;

GRANT DELETE ON download_events TO service_role;

GRANT TRUNCATE ON download_events TO service_role;

GRANT REFERENCES ON download_events TO service_role;

GRANT REFERENCES ON funun TO anon;

GRANT INSERT ON funun TO anon;

GRANT SELECT ON funun TO anon;

GRANT UPDATE ON funun TO anon;

GRANT DELETE ON funun TO anon;

GRANT TRUNCATE ON funun TO anon;

GRANT TRIGGER ON funun TO anon;

GRANT TRIGGER ON funun TO authenticated;

GRANT SELECT ON funun TO authenticated;

GRANT UPDATE ON funun TO authenticated;

GRANT DELETE ON funun TO authenticated;

GRANT TRUNCATE ON funun TO authenticated;

GRANT REFERENCES ON funun TO authenticated;

GRANT INSERT ON funun TO authenticated;

GRANT REFERENCES ON funun TO service_role;

GRANT TRIGGER ON funun TO service_role;

GRANT INSERT ON funun TO service_role;

GRANT SELECT ON funun TO service_role;

GRANT UPDATE ON funun TO service_role;

GRANT DELETE ON funun TO service_role;

GRANT TRUNCATE ON funun TO service_role;

GRANT REFERENCES ON hero_images TO anon;

GRANT TRIGGER ON hero_images TO anon;

GRANT INSERT ON hero_images TO anon;

GRANT SELECT ON hero_images TO anon;

GRANT UPDATE ON hero_images TO anon;

GRANT DELETE ON hero_images TO anon;

GRANT TRUNCATE ON hero_images TO anon;

GRANT REFERENCES ON hero_images TO authenticated;

GRANT INSERT ON hero_images TO authenticated;

GRANT SELECT ON hero_images TO authenticated;

GRANT UPDATE ON hero_images TO authenticated;

GRANT DELETE ON hero_images TO authenticated;

GRANT TRUNCATE ON hero_images TO authenticated;

GRANT TRIGGER ON hero_images TO authenticated;

GRANT INSERT ON hero_images TO service_role;

GRANT SELECT ON hero_images TO service_role;

GRANT UPDATE ON hero_images TO service_role;

GRANT DELETE ON hero_images TO service_role;

GRANT TRUNCATE ON hero_images TO service_role;

GRANT REFERENCES ON hero_images TO service_role;

GRANT TRIGGER ON hero_images TO service_role;

GRANT INSERT ON lyrics_views TO anon;

GRANT TRIGGER ON lyrics_views TO anon;

GRANT REFERENCES ON lyrics_views TO anon;

GRANT TRUNCATE ON lyrics_views TO anon;

GRANT DELETE ON lyrics_views TO anon;

GRANT UPDATE ON lyrics_views TO anon;

GRANT SELECT ON lyrics_views TO anon;

GRANT TRIGGER ON lyrics_views TO authenticated;

GRANT INSERT ON lyrics_views TO authenticated;

GRANT SELECT ON lyrics_views TO authenticated;

GRANT UPDATE ON lyrics_views TO authenticated;

GRANT DELETE ON lyrics_views TO authenticated;

GRANT TRUNCATE ON lyrics_views TO authenticated;

GRANT REFERENCES ON lyrics_views TO authenticated;

GRANT TRIGGER ON lyrics_views TO service_role;

GRANT INSERT ON lyrics_views TO service_role;

GRANT UPDATE ON lyrics_views TO service_role;

GRANT DELETE ON lyrics_views TO service_role;

GRANT SELECT ON lyrics_views TO service_role;

GRANT TRUNCATE ON lyrics_views TO service_role;

GRANT REFERENCES ON lyrics_views TO service_role;

GRANT TRIGGER ON madha TO anon;

GRANT REFERENCES ON madha TO anon;

GRANT TRUNCATE ON madha TO anon;

GRANT DELETE ON madha TO anon;

GRANT UPDATE ON madha TO anon;

GRANT SELECT ON madha TO anon;

GRANT INSERT ON madha TO anon;

GRANT TRIGGER ON madha TO authenticated;

GRANT INSERT ON madha TO authenticated;

GRANT SELECT ON madha TO authenticated;

GRANT UPDATE ON madha TO authenticated;

GRANT DELETE ON madha TO authenticated;

GRANT TRUNCATE ON madha TO authenticated;

GRANT REFERENCES ON madha TO authenticated;

GRANT DELETE ON madha TO service_role;

GRANT TRIGGER ON madha TO service_role;

GRANT REFERENCES ON madha TO service_role;

GRANT TRUNCATE ON madha TO service_role;

GRANT UPDATE ON madha TO service_role;

GRANT SELECT ON madha TO service_role;

GRANT INSERT ON madha TO service_role;

GRANT INSERT ON madiheen TO anon;

GRANT TRIGGER ON madiheen TO anon;

GRANT REFERENCES ON madiheen TO anon;

GRANT TRUNCATE ON madiheen TO anon;

GRANT DELETE ON madiheen TO anon;

GRANT UPDATE ON madiheen TO anon;

GRANT SELECT ON madiheen TO anon;

GRANT INSERT ON madiheen TO authenticated;

GRANT TRIGGER ON madiheen TO authenticated;

GRANT REFERENCES ON madiheen TO authenticated;

GRANT TRUNCATE ON madiheen TO authenticated;

GRANT DELETE ON madiheen TO authenticated;

GRANT UPDATE ON madiheen TO authenticated;

GRANT SELECT ON madiheen TO authenticated;

GRANT SELECT ON madiheen TO service_role;

GRANT INSERT ON madiheen TO service_role;

GRANT TRIGGER ON madiheen TO service_role;

GRANT REFERENCES ON madiheen TO service_role;

GRANT TRUNCATE ON madiheen TO service_role;

GRANT DELETE ON madiheen TO service_role;

GRANT UPDATE ON madiheen TO service_role;

GRANT TRIGGER ON ruwat TO anon;

GRANT REFERENCES ON ruwat TO anon;

GRANT TRUNCATE ON ruwat TO anon;

GRANT DELETE ON ruwat TO anon;

GRANT UPDATE ON ruwat TO anon;

GRANT SELECT ON ruwat TO anon;

GRANT INSERT ON ruwat TO anon;

GRANT TRUNCATE ON ruwat TO authenticated;

GRANT SELECT ON ruwat TO authenticated;

GRANT UPDATE ON ruwat TO authenticated;

GRANT DELETE ON ruwat TO authenticated;

GRANT INSERT ON ruwat TO authenticated;

GRANT REFERENCES ON ruwat TO authenticated;

GRANT TRIGGER ON ruwat TO authenticated;

GRANT INSERT ON ruwat TO service_role;

GRANT SELECT ON ruwat TO service_role;

GRANT UPDATE ON ruwat TO service_role;

GRANT DELETE ON ruwat TO service_role;

GRANT TRUNCATE ON ruwat TO service_role;

GRANT REFERENCES ON ruwat TO service_role;

GRANT TRIGGER ON ruwat TO service_role;

GRANT TRIGGER ON tracks TO anon;

GRANT REFERENCES ON tracks TO anon;

GRANT TRUNCATE ON tracks TO anon;

GRANT DELETE ON tracks TO anon;

GRANT UPDATE ON tracks TO anon;

GRANT SELECT ON tracks TO anon;

GRANT INSERT ON tracks TO anon;

GRANT REFERENCES ON tracks TO authenticated;

GRANT INSERT ON tracks TO authenticated;

GRANT SELECT ON tracks TO authenticated;

GRANT UPDATE ON tracks TO authenticated;

GRANT DELETE ON tracks TO authenticated;

GRANT TRUNCATE ON tracks TO authenticated;

GRANT TRIGGER ON tracks TO authenticated;

GRANT REFERENCES ON tracks TO service_role;

GRANT INSERT ON tracks TO service_role;

GRANT SELECT ON tracks TO service_role;

GRANT UPDATE ON tracks TO service_role;

GRANT DELETE ON tracks TO service_role;

GRANT TRUNCATE ON tracks TO service_role;

GRANT TRIGGER ON tracks TO service_role;

GRANT TRIGGER ON turuq TO anon;

GRANT INSERT ON turuq TO anon;

GRANT SELECT ON turuq TO anon;

GRANT UPDATE ON turuq TO anon;

GRANT DELETE ON turuq TO anon;

GRANT TRUNCATE ON turuq TO anon;

GRANT REFERENCES ON turuq TO anon;

GRANT INSERT ON turuq TO authenticated;

GRANT TRIGGER ON turuq TO authenticated;

GRANT REFERENCES ON turuq TO authenticated;

GRANT TRUNCATE ON turuq TO authenticated;

GRANT DELETE ON turuq TO authenticated;

GRANT UPDATE ON turuq TO authenticated;

GRANT SELECT ON turuq TO authenticated;

GRANT SELECT ON turuq TO service_role;

GRANT TRIGGER ON turuq TO service_role;

GRANT REFERENCES ON turuq TO service_role;

GRANT TRUNCATE ON turuq TO service_role;

GRANT DELETE ON turuq TO service_role;

GRANT UPDATE ON turuq TO service_role;

GRANT INSERT ON turuq TO service_role;

GRANT SELECT ON user_favorites TO anon;

GRANT UPDATE ON user_favorites TO anon;

GRANT INSERT ON user_favorites TO anon;

GRANT DELETE ON user_favorites TO anon;

GRANT TRUNCATE ON user_favorites TO anon;

GRANT REFERENCES ON user_favorites TO anon;

GRANT TRIGGER ON user_favorites TO anon;

GRANT INSERT ON user_favorites TO authenticated;

GRANT TRIGGER ON user_favorites TO authenticated;

GRANT REFERENCES ON user_favorites TO authenticated;

GRANT TRUNCATE ON user_favorites TO authenticated;

GRANT DELETE ON user_favorites TO authenticated;

GRANT UPDATE ON user_favorites TO authenticated;

GRANT SELECT ON user_favorites TO authenticated;

GRANT INSERT ON user_favorites TO service_role;

GRANT SELECT ON user_favorites TO service_role;

GRANT UPDATE ON user_favorites TO service_role;

GRANT DELETE ON user_favorites TO service_role;

GRANT TRUNCATE ON user_favorites TO service_role;

GRANT REFERENCES ON user_favorites TO service_role;

GRANT TRIGGER ON user_favorites TO service_role;

GRANT TRIGGER ON user_follows TO anon;

GRANT REFERENCES ON user_follows TO anon;

GRANT TRUNCATE ON user_follows TO anon;

GRANT DELETE ON user_follows TO anon;

GRANT UPDATE ON user_follows TO anon;

GRANT SELECT ON user_follows TO anon;

GRANT INSERT ON user_follows TO anon;

GRANT SELECT ON user_follows TO authenticated;

GRANT TRIGGER ON user_follows TO authenticated;

GRANT INSERT ON user_follows TO authenticated;

GRANT REFERENCES ON user_follows TO authenticated;

GRANT TRUNCATE ON user_follows TO authenticated;

GRANT DELETE ON user_follows TO authenticated;

GRANT UPDATE ON user_follows TO authenticated;

GRANT TRIGGER ON user_follows TO service_role;

GRANT SELECT ON user_follows TO service_role;

GRANT UPDATE ON user_follows TO service_role;

GRANT DELETE ON user_follows TO service_role;

GRANT TRUNCATE ON user_follows TO service_role;

GRANT REFERENCES ON user_follows TO service_role;

GRANT INSERT ON user_follows TO service_role;

GRANT TRIGGER ON user_plays TO anon;

GRANT REFERENCES ON user_plays TO anon;

GRANT TRUNCATE ON user_plays TO anon;

GRANT DELETE ON user_plays TO anon;

GRANT UPDATE ON user_plays TO anon;

GRANT SELECT ON user_plays TO anon;

GRANT INSERT ON user_plays TO anon;

GRANT TRIGGER ON user_plays TO authenticated;

GRANT REFERENCES ON user_plays TO authenticated;

GRANT TRUNCATE ON user_plays TO authenticated;

GRANT DELETE ON user_plays TO authenticated;

GRANT UPDATE ON user_plays TO authenticated;

GRANT SELECT ON user_plays TO authenticated;

GRANT INSERT ON user_plays TO authenticated;

GRANT TRUNCATE ON user_plays TO service_role;

GRANT TRIGGER ON user_plays TO service_role;

GRANT REFERENCES ON user_plays TO service_role;

GRANT DELETE ON user_plays TO service_role;

GRANT UPDATE ON user_plays TO service_role;

GRANT SELECT ON user_plays TO service_role;

GRANT INSERT ON user_plays TO service_role;

GRANT INSERT ON user_profiles TO anon;

GRANT TRIGGER ON user_profiles TO anon;

GRANT SELECT ON user_profiles TO anon;

GRANT UPDATE ON user_profiles TO anon;

GRANT DELETE ON user_profiles TO anon;

GRANT TRUNCATE ON user_profiles TO anon;

GRANT REFERENCES ON user_profiles TO anon;

GRANT REFERENCES ON user_profiles TO authenticated;

GRANT TRUNCATE ON user_profiles TO authenticated;

GRANT DELETE ON user_profiles TO authenticated;

GRANT UPDATE ON user_profiles TO authenticated;

GRANT SELECT ON user_profiles TO authenticated;

GRANT INSERT ON user_profiles TO authenticated;

GRANT TRIGGER ON user_profiles TO authenticated;

GRANT SELECT ON user_profiles TO service_role;

GRANT INSERT ON user_profiles TO service_role;

GRANT UPDATE ON user_profiles TO service_role;

GRANT DELETE ON user_profiles TO service_role;

GRANT TRUNCATE ON user_profiles TO service_role;

GRANT REFERENCES ON user_profiles TO service_role;

GRANT TRIGGER ON user_profiles TO service_role;

GRANT INSERT ON user_roles TO anon;

GRANT SELECT ON user_roles TO anon;

GRANT UPDATE ON user_roles TO anon;

GRANT DELETE ON user_roles TO anon;

GRANT TRUNCATE ON user_roles TO anon;

GRANT REFERENCES ON user_roles TO anon;

GRANT TRIGGER ON user_roles TO anon;

GRANT INSERT ON user_roles TO authenticated;

GRANT SELECT ON user_roles TO authenticated;

GRANT UPDATE ON user_roles TO authenticated;

GRANT DELETE ON user_roles TO authenticated;

GRANT TRUNCATE ON user_roles TO authenticated;

GRANT REFERENCES ON user_roles TO authenticated;

GRANT TRIGGER ON user_roles TO authenticated;

GRANT TRIGGER ON user_roles TO service_role;

GRANT REFERENCES ON user_roles TO service_role;

GRANT TRUNCATE ON user_roles TO service_role;

GRANT DELETE ON user_roles TO service_role;

GRANT UPDATE ON user_roles TO service_role;

GRANT SELECT ON user_roles TO service_role;

GRANT INSERT ON user_roles TO service_role;

GRANT INSERT ON v_artists TO anon;

GRANT TRIGGER ON v_artists TO anon;

GRANT REFERENCES ON v_artists TO anon;

GRANT TRUNCATE ON v_artists TO anon;

GRANT DELETE ON v_artists TO anon;

GRANT UPDATE ON v_artists TO anon;

GRANT SELECT ON v_artists TO anon;

GRANT INSERT ON v_artists TO authenticated;

GRANT SELECT ON v_artists TO authenticated;

GRANT UPDATE ON v_artists TO authenticated;

GRANT DELETE ON v_artists TO authenticated;

GRANT TRUNCATE ON v_artists TO authenticated;

GRANT REFERENCES ON v_artists TO authenticated;

GRANT TRIGGER ON v_artists TO authenticated;

GRANT SELECT ON v_artists TO service_role;

GRANT UPDATE ON v_artists TO service_role;

GRANT DELETE ON v_artists TO service_role;

GRANT TRUNCATE ON v_artists TO service_role;

GRANT REFERENCES ON v_artists TO service_role;

GRANT TRIGGER ON v_artists TO service_role;

GRANT INSERT ON v_artists TO service_role;

GRANT TRIGGER ON v_collections TO anon;

GRANT SELECT ON v_collections TO anon;

GRANT UPDATE ON v_collections TO anon;

GRANT DELETE ON v_collections TO anon;

GRANT TRUNCATE ON v_collections TO anon;

GRANT REFERENCES ON v_collections TO anon;

GRANT INSERT ON v_collections TO anon;

GRANT DELETE ON v_collections TO authenticated;

GRANT TRIGGER ON v_collections TO authenticated;

GRANT REFERENCES ON v_collections TO authenticated;

GRANT TRUNCATE ON v_collections TO authenticated;

GRANT UPDATE ON v_collections TO authenticated;

GRANT SELECT ON v_collections TO authenticated;

GRANT INSERT ON v_collections TO authenticated;

GRANT INSERT ON v_collections TO service_role;

GRANT SELECT ON v_collections TO service_role;

GRANT UPDATE ON v_collections TO service_role;

GRANT DELETE ON v_collections TO service_role;

GRANT TRUNCATE ON v_collections TO service_role;

GRANT REFERENCES ON v_collections TO service_role;

GRANT TRIGGER ON v_collections TO service_role;

GRANT TRIGGER ON v_download_events_external TO anon;

GRANT REFERENCES ON v_download_events_external TO anon;

GRANT TRUNCATE ON v_download_events_external TO anon;

GRANT DELETE ON v_download_events_external TO anon;

GRANT UPDATE ON v_download_events_external TO anon;

GRANT SELECT ON v_download_events_external TO anon;

GRANT INSERT ON v_download_events_external TO anon;

GRANT INSERT ON v_download_events_external TO authenticated;

GRANT TRIGGER ON v_download_events_external TO authenticated;

GRANT REFERENCES ON v_download_events_external TO authenticated;

GRANT TRUNCATE ON v_download_events_external TO authenticated;

GRANT DELETE ON v_download_events_external TO authenticated;

GRANT UPDATE ON v_download_events_external TO authenticated;

GRANT SELECT ON v_download_events_external TO authenticated;

GRANT TRIGGER ON v_download_events_external TO service_role;

GRANT SELECT ON v_download_events_external TO service_role;

GRANT UPDATE ON v_download_events_external TO service_role;

GRANT DELETE ON v_download_events_external TO service_role;

GRANT INSERT ON v_download_events_external TO service_role;

GRANT TRUNCATE ON v_download_events_external TO service_role;

GRANT REFERENCES ON v_download_events_external TO service_role;

GRANT SELECT ON v_follower_counts TO anon;

GRANT UPDATE ON v_follower_counts TO anon;

GRANT DELETE ON v_follower_counts TO anon;

GRANT TRUNCATE ON v_follower_counts TO anon;

GRANT REFERENCES ON v_follower_counts TO anon;

GRANT TRIGGER ON v_follower_counts TO anon;

GRANT INSERT ON v_follower_counts TO anon;

GRANT INSERT ON v_follower_counts TO authenticated;

GRANT UPDATE ON v_follower_counts TO authenticated;

GRANT DELETE ON v_follower_counts TO authenticated;

GRANT TRUNCATE ON v_follower_counts TO authenticated;

GRANT REFERENCES ON v_follower_counts TO authenticated;

GRANT TRIGGER ON v_follower_counts TO authenticated;

GRANT SELECT ON v_follower_counts TO authenticated;

GRANT UPDATE ON v_follower_counts TO service_role;

GRANT INSERT ON v_follower_counts TO service_role;

GRANT SELECT ON v_follower_counts TO service_role;

GRANT DELETE ON v_follower_counts TO service_role;

GRANT TRUNCATE ON v_follower_counts TO service_role;

GRANT REFERENCES ON v_follower_counts TO service_role;

GRANT TRIGGER ON v_follower_counts TO service_role;

GRANT INSERT ON v_narrators TO anon;

GRANT TRIGGER ON v_narrators TO anon;

GRANT REFERENCES ON v_narrators TO anon;

GRANT TRUNCATE ON v_narrators TO anon;

GRANT DELETE ON v_narrators TO anon;

GRANT UPDATE ON v_narrators TO anon;

GRANT SELECT ON v_narrators TO anon;

GRANT TRIGGER ON v_narrators TO authenticated;

GRANT INSERT ON v_narrators TO authenticated;

GRANT SELECT ON v_narrators TO authenticated;

GRANT UPDATE ON v_narrators TO authenticated;

GRANT DELETE ON v_narrators TO authenticated;

GRANT TRUNCATE ON v_narrators TO authenticated;

GRANT REFERENCES ON v_narrators TO authenticated;

GRANT INSERT ON v_narrators TO service_role;

GRANT TRIGGER ON v_narrators TO service_role;

GRANT REFERENCES ON v_narrators TO service_role;

GRANT TRUNCATE ON v_narrators TO service_role;

GRANT DELETE ON v_narrators TO service_role;

GRANT UPDATE ON v_narrators TO service_role;

GRANT SELECT ON v_narrators TO service_role;

GRANT REFERENCES ON v_recent_listens TO anon;

GRANT TRIGGER ON v_recent_listens TO anon;

GRANT INSERT ON v_recent_listens TO anon;

GRANT SELECT ON v_recent_listens TO anon;

GRANT UPDATE ON v_recent_listens TO anon;

GRANT DELETE ON v_recent_listens TO anon;

GRANT TRUNCATE ON v_recent_listens TO anon;

GRANT INSERT ON v_recent_listens TO authenticated;

GRANT TRIGGER ON v_recent_listens TO authenticated;

GRANT REFERENCES ON v_recent_listens TO authenticated;

GRANT TRUNCATE ON v_recent_listens TO authenticated;

GRANT DELETE ON v_recent_listens TO authenticated;

GRANT UPDATE ON v_recent_listens TO authenticated;

GRANT SELECT ON v_recent_listens TO authenticated;

GRANT TRIGGER ON v_recent_listens TO service_role;

GRANT REFERENCES ON v_recent_listens TO service_role;

GRANT INSERT ON v_recent_listens TO service_role;

GRANT SELECT ON v_recent_listens TO service_role;

GRANT UPDATE ON v_recent_listens TO service_role;

GRANT DELETE ON v_recent_listens TO service_role;

GRANT TRUNCATE ON v_recent_listens TO service_role;

GRANT INSERT ON v_tracks_admin TO anon;

GRANT SELECT ON v_tracks_admin TO anon;

GRANT UPDATE ON v_tracks_admin TO anon;

GRANT DELETE ON v_tracks_admin TO anon;

GRANT TRUNCATE ON v_tracks_admin TO anon;

GRANT REFERENCES ON v_tracks_admin TO anon;

GRANT TRIGGER ON v_tracks_admin TO anon;

GRANT UPDATE ON v_tracks_admin TO authenticated;

GRANT SELECT ON v_tracks_admin TO authenticated;

GRANT INSERT ON v_tracks_admin TO authenticated;

GRANT TRIGGER ON v_tracks_admin TO authenticated;

GRANT REFERENCES ON v_tracks_admin TO authenticated;

GRANT TRUNCATE ON v_tracks_admin TO authenticated;

GRANT DELETE ON v_tracks_admin TO authenticated;

GRANT INSERT ON v_tracks_admin TO service_role;

GRANT SELECT ON v_tracks_admin TO service_role;

GRANT TRIGGER ON v_tracks_admin TO service_role;

GRANT REFERENCES ON v_tracks_admin TO service_role;

GRANT TRUNCATE ON v_tracks_admin TO service_role;

GRANT DELETE ON v_tracks_admin TO service_role;

GRANT UPDATE ON v_tracks_admin TO service_role;

GRANT REFERENCES ON v_tracks TO anon;

GRANT TRIGGER ON v_tracks TO anon;

GRANT TRUNCATE ON v_tracks TO anon;

GRANT DELETE ON v_tracks TO anon;

GRANT UPDATE ON v_tracks TO anon;

GRANT SELECT ON v_tracks TO anon;

GRANT INSERT ON v_tracks TO anon;

GRANT INSERT ON v_tracks TO authenticated;

GRANT TRIGGER ON v_tracks TO authenticated;

GRANT REFERENCES ON v_tracks TO authenticated;

GRANT TRUNCATE ON v_tracks TO authenticated;

GRANT DELETE ON v_tracks TO authenticated;

GRANT UPDATE ON v_tracks TO authenticated;

GRANT SELECT ON v_tracks TO authenticated;

GRANT INSERT ON v_tracks TO service_role;

GRANT TRIGGER ON v_tracks TO service_role;

GRANT REFERENCES ON v_tracks TO service_role;

GRANT TRUNCATE ON v_tracks TO service_role;

GRANT DELETE ON v_tracks TO service_role;

GRANT UPDATE ON v_tracks TO service_role;

GRANT SELECT ON v_tracks TO service_role;

GRANT SELECT ON v_user_favorites_external TO anon;

GRANT TRIGGER ON v_user_favorites_external TO anon;

GRANT REFERENCES ON v_user_favorites_external TO anon;

GRANT TRUNCATE ON v_user_favorites_external TO anon;

GRANT DELETE ON v_user_favorites_external TO anon;

GRANT UPDATE ON v_user_favorites_external TO anon;

GRANT INSERT ON v_user_favorites_external TO anon;

GRANT INSERT ON v_user_favorites_external TO authenticated;

GRANT SELECT ON v_user_favorites_external TO authenticated;

GRANT UPDATE ON v_user_favorites_external TO authenticated;

GRANT DELETE ON v_user_favorites_external TO authenticated;

GRANT TRUNCATE ON v_user_favorites_external TO authenticated;

GRANT REFERENCES ON v_user_favorites_external TO authenticated;

GRANT TRIGGER ON v_user_favorites_external TO authenticated;

GRANT INSERT ON v_user_favorites_external TO service_role;

GRANT TRIGGER ON v_user_favorites_external TO service_role;

GRANT REFERENCES ON v_user_favorites_external TO service_role;

GRANT TRUNCATE ON v_user_favorites_external TO service_role;

GRANT DELETE ON v_user_favorites_external TO service_role;

GRANT UPDATE ON v_user_favorites_external TO service_role;

GRANT SELECT ON v_user_favorites_external TO service_role;

GRANT REFERENCES ON v_user_plays_external TO anon;

GRANT INSERT ON v_user_plays_external TO anon;

GRANT SELECT ON v_user_plays_external TO anon;

GRANT UPDATE ON v_user_plays_external TO anon;

GRANT DELETE ON v_user_plays_external TO anon;

GRANT TRUNCATE ON v_user_plays_external TO anon;

GRANT TRIGGER ON v_user_plays_external TO anon;

GRANT INSERT ON v_user_plays_external TO authenticated;

GRANT TRIGGER ON v_user_plays_external TO authenticated;

GRANT REFERENCES ON v_user_plays_external TO authenticated;

GRANT TRUNCATE ON v_user_plays_external TO authenticated;

GRANT DELETE ON v_user_plays_external TO authenticated;

GRANT UPDATE ON v_user_plays_external TO authenticated;

GRANT SELECT ON v_user_plays_external TO authenticated;

GRANT SELECT ON v_user_plays_external TO service_role;

GRANT INSERT ON v_user_plays_external TO service_role;

GRANT TRIGGER ON v_user_plays_external TO service_role;

GRANT REFERENCES ON v_user_plays_external TO service_role;

GRANT TRUNCATE ON v_user_plays_external TO service_role;

GRANT DELETE ON v_user_plays_external TO service_role;

GRANT UPDATE ON v_user_plays_external TO service_role;