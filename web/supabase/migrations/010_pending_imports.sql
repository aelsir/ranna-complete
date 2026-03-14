-- Migration: Create pending_imports table for YouTube URL submission queue
-- This table stores YouTube URLs submitted by users for admin review and local processing

CREATE TABLE pending_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_url TEXT NOT NULL,
    title TEXT NOT NULL,
    madih_id UUID REFERENCES madiheen(id),
    madih_name TEXT, -- For display if madih_id is not set yet
    rawi_id UUID REFERENCES ruwat(id),
    rawi_name TEXT, -- For display if rawi_id is not set yet
    submitted_by UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    madha_id UUID REFERENCES madha(id) -- Link to created madha after processing
);

-- Index for common queries
CREATE INDEX idx_pending_imports_status ON pending_imports(status);
CREATE INDEX idx_pending_imports_submitted_by ON pending_imports(submitted_by);

-- Enable RLS
ALTER TABLE pending_imports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own submissions
CREATE POLICY "Users can submit imports"
ON pending_imports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);

-- Policy: Users can view their own submissions
CREATE POLICY "Users can view own imports"
ON pending_imports FOR SELECT
TO authenticated
USING (auth.uid() = submitted_by);

-- Policy: Admins can view all submissions
CREATE POLICY "Admins can view all imports"
ON pending_imports FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Policy: Admins can update submissions (for processing)
CREATE POLICY "Admins can update imports"
ON pending_imports FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Policy: Admins can delete submissions
CREATE POLICY "Admins can delete imports"
ON pending_imports FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);
