-- Migration: Add play_events table and trending view
-- Enables dynamic "most listened this week" section

-- 1. Create play_events table to log each play with a timestamp
CREATE TABLE IF NOT EXISTS play_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    madha_id UUID NOT NULL REFERENCES madha(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient trending queries
CREATE INDEX idx_play_events_played_at ON play_events(played_at DESC);
CREATE INDEX idx_play_events_madha_played ON play_events(madha_id, played_at DESC);

-- Enable RLS (allow inserts from authenticated users, reads via function)
ALTER TABLE play_events ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can log a play
CREATE POLICY "Authenticated users can insert play events"
    ON play_events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow anonymous inserts too (for non-logged-in users)
CREATE POLICY "Anonymous users can insert play events"
    ON play_events FOR INSERT
    TO anon
    WITH CHECK (user_id IS NULL);

-- 2. Create a database function to get trending tracks from last N days
--    Returns madha rows ordered by play count in the given window
CREATE OR REPLACE FUNCTION get_trending_tracks(
    days_window INTEGER DEFAULT 7,
    max_results INTEGER DEFAULT 10
)
RETURNS SETOF madha
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT m.*
    FROM madha m
    INNER JOIN (
        SELECT madha_id, COUNT(*) AS recent_plays
        FROM play_events
        WHERE played_at >= NOW() - (days_window || ' days')::INTERVAL
        GROUP BY madha_id
        ORDER BY recent_plays DESC
        LIMIT max_results
    ) trending ON trending.madha_id = m.id
    WHERE m.status = 'approved'
    ORDER BY trending.recent_plays DESC;
$$;

-- Grant execute to all roles
GRANT EXECUTE ON FUNCTION get_trending_tracks TO anon, authenticated, service_role;
