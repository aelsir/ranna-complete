-- Migration 029: Add download_events table for tracking offline downloads
-- Mirrors the pattern used by play_events (migration 020) and user_plays (013)

-- ============================================
-- 1. CREATE download_events TABLE
-- ============================================
CREATE TABLE download_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES madha(id) ON DELETE CASCADE,
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
-- 3. ADD download_count COLUMN TO madha
-- ============================================
ALTER TABLE madha ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- ============================================
-- 4. RPC: increment_download_count
-- ============================================
CREATE OR REPLACE FUNCTION increment_download_count(p_track_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE madha
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
                    m.id,
                    m.title,
                    COUNT(de.id) AS download_count
                FROM download_events de
                JOIN madha m ON m.id = de.track_id
                GROUP BY m.id, m.title
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
