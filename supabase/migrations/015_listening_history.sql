-- Migration: Add listening history table
-- This enables the "Continue Listening" feature for logged-in users
-- Data persists across devices and syncs with user account

-- Create listening_history table
CREATE TABLE IF NOT EXISTS listening_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    madha_id UUID NOT NULL REFERENCES madha(id) ON DELETE CASCADE,
    listened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: one entry per user per madha (we'll update timestamp on replay)
    UNIQUE(user_id, madha_id)
);

-- Create index for efficient queries
CREATE INDEX idx_listening_history_user_id ON listening_history(user_id);
CREATE INDEX idx_listening_history_listened_at ON listening_history(listened_at DESC);

-- Enable RLS
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own history
CREATE POLICY "Users can view own listening history"
    ON listening_history FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert own listening history"
    ON listening_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own history (for updating listened_at timestamp)
CREATE POLICY "Users can update own listening history"
    ON listening_history FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete own listening history"
    ON listening_history FOR DELETE
    USING (auth.uid() = user_id);
