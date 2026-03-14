-- Migration: Add needs_processing column for unified upload workflow
-- TRUE = URL import that needs admin to process via local service
-- FALSE = Direct file upload, ready for review

ALTER TABLE madha ADD COLUMN IF NOT EXISTS needs_processing BOOLEAN DEFAULT FALSE;

-- Index for admin queries (find items that need processing)
CREATE INDEX IF NOT EXISTS idx_madha_needs_processing ON madha(needs_processing) WHERE needs_processing = TRUE;
