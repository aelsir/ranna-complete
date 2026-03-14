-- Migration: Migrate pending imports to madha table and drop old table

-- 1. Make audio_url optional in madha (since imports don't have it initially)
ALTER TABLE madha ALTER COLUMN audio_url DROP NOT NULL;

-- 2. Migrate pending data
INSERT INTO madha (
    title,
    source_url,
    madih,
    writer,
    madih_id,
    rawi_id,
    user_id,
    status,
    needs_processing,
    rejection_reason,
    created_at
)
SELECT
    title,
    youtube_url,
    COALESCE(madih_name, 'Unknown'), -- Ensure madih is not null if required
    rawi_name,
    madih_id,
    rawi_id,
    submitted_by,
    CASE 
        WHEN status = 'failed' THEN 'rejected' 
        ELSE 'pending' 
    END,
    TRUE, -- All imported from here need processing (downloads)
    error_message,
    created_at
FROM pending_imports
WHERE status IN ('pending', 'processing', 'failed');

-- 3. Drop pending_imports table
DROP TABLE pending_imports;
