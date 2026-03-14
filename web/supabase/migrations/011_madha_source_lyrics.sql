-- Migration: Add source_url and lyrics fields to madha table
-- source_url: Optional field to indicate the original source (YouTube, SoundCloud, etc.)
-- lyrics: Optional field for the lyrics/words (كلمات) of the madha

ALTER TABLE madha ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE madha ADD COLUMN IF NOT EXISTS lyrics TEXT;

-- Optional: Add a comment for documentation
COMMENT ON COLUMN madha.source_url IS 'Original source URL (YouTube, SoundCloud, etc.)';
COMMENT ON COLUMN madha.lyrics IS 'Lyrics/words (كلمات) of the madha';
