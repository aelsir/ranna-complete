-- Migration 029: Add download_events table for tracking offline downloads
-- Mirrors the pattern used by play_events (migration 020) and user_plays (013)
-- NOTE: The real table is "tracks" (renamed in migration 025).
--       "madha" is just a backward-compatible view, so FKs must reference "tracks".

-- ============================================
-- 1. CREATE download_events TABLE
-- ============================================
CREATE TABLE download_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_type TEXT,                        -- 'ios', 'android'
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_download_events_track ON download_events(track_id);
CREATE INDEX idx_download_events_user ON download_events(user_id);
CREATE INDEX idx_download_events_downloaded_at ON download_events(downloaded_at DESC);

-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE download_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can log their own downloads
CREATE POLICY "Authenticated users can insert download events"
    ON download_events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Anonymous users can log downloads too (user_id will be NULL)
CREATE POLICY "Anonymous users can insert download events"
    ON download_events FOR INSERT
    TO anon
    WITH CHECK (user_id IS NULL);

-- Admins can view all download events for the dashboard
CREATE POLICY "Admins can view all download events"
    ON download_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.role IN ('admin', 'superuser')
        )
    );

-- ============================================
-- 3. ADD download_count COLUMN TO tracks
-- ============================================
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- Also expose it through the madha alias view (must recreate)
CREATE OR REPLACE VIEW madha AS
SELECT
    id, title, madih, writer, audio_url, image_url,
    artist_id AS madih_id, author_id AS rawi_id,
    user_id, status, needs_processing, rejection_reason,
    reviewed_by, reviewed_at, source_url,
    recording_place, tariqa_id, fan_id,
    play_count, duration_seconds, is_featured,
    lyrics, created_at, updated_at,
    file_size_bytes, thumbnail_url, content_type,
    download_count
FROM tracks;

-- Recreate INSTEAD OF triggers (required after view replacement)
CREATE OR REPLACE FUNCTION madha_alias_insert_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
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
$$;

CREATE OR REPLACE FUNCTION madha_alias_update_fn() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
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
$$;

-- ============================================
-- 4. RPC: increment_download_count
-- ============================================
CREATE OR REPLACE FUNCTION increment_download_count(p_track_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE tracks
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = p_track_id;
$$;

GRANT EXECUTE ON FUNCTION increment_download_count TO anon, authenticated, service_role;

-- ============================================
-- 5. RPC: get_download_stats (for admin dashboard)
-- ============================================
CREATE OR REPLACE FUNCTION get_download_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION get_download_stats TO authenticated;
