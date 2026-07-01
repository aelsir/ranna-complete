-- Migration 054: track_curation — internal editorial state, per track
--
-- A 1:1 side table for admin-only curation metadata (lyrics review pipeline,
-- audio quality rating, reviewer notes). Kept OFF `tracks` deliberately:
--   * different audience — never exposed to end users; v_tracks stays untouched
--   * different writers — only admins write here; uploaders can UPDATE their
--     own `tracks` rows and must not be able to mark their lyrics reviewed
--   * different growth — future per-aspect statuses (metadata review, …) land
--     here as plain columns without touching what the apps read
--
-- Distinct from `track_reviews` (051), which is the append-only moderation
-- log for user uploads. This table is CURRENT state, one row per track,
-- created lazily on first curation write; absence of a row means
-- "unreviewed / unrated" (the admin view coalesces the default).

BEGIN;

CREATE TABLE IF NOT EXISTS track_curation (
  track_id      uuid PRIMARY KEY REFERENCES tracks (id) ON DELETE CASCADE,
  lyrics_status text NOT NULL DEFAULT 'unreviewed'
                CHECK (lyrics_status IN ('unreviewed', 'needs_work', 'reviewed')),
  audio_quality text CHECK (audio_quality IN ('excellent', 'good', 'poor')),
  notes         text,
  updated_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE track_curation IS
  'Admin-only editorial state per track (1:1, lazily created). Current state, not history — see track_reviews for the upload-moderation log.';
COMMENT ON COLUMN track_curation.lyrics_status IS
  'Lyrics review pipeline: unreviewed (default) → needs_work (flagged, revisit later) → reviewed (checked and good).';
COMMENT ON COLUMN track_curation.audio_quality IS
  'Editorial audio quality rating; NULL = not yet rated.';
COMMENT ON COLUMN track_curation.notes IS
  'Free-form reviewer note, e.g. what to fix when lyrics_status = needs_work.';
COMMENT ON COLUMN track_curation.updated_by IS
  'Admin who last touched this row; null if their account was later deleted.';

-- Filtering the الكلمات view by pipeline stage.
CREATE INDEX IF NOT EXISTS idx_track_curation_lyrics_status
  ON track_curation (lyrics_status);

CREATE TRIGGER track_curation_updated_at
  BEFORE UPDATE ON track_curation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Admins only, read and write. No public exposure anywhere.
ALTER TABLE track_curation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage track curation" ON track_curation FOR ALL TO public
  USING (is_admin_or_superuser()) WITH CHECK (is_admin_or_superuser());
GRANT ALL ON track_curation TO authenticated, service_role;

-- Surface curation state on the admin view (dashboard reads this).
-- CREATE OR REPLACE with columns appended at the end, same approach as 052,
-- so grants are preserved. Missing curation row coalesces to the defaults.
-- v_tracks (public) intentionally does NOT get these columns.
CREATE OR REPLACE VIEW v_tracks_admin WITH (security_invoker = on) AS
SELECT t.id, t.title, t.madih, t.writer, t.audio_url, t.image_url,
       t.artist_id AS madih_id, t.author_id AS rawi_id,
       t.uploader_id, t.status, t.needs_processing,
       t.source_url, t.recording_place, t.tariqa_id, t.fan_id,
       t.play_count, t.duration_seconds, t.is_featured, t.lyrics,
       t.created_at, t.updated_at, t.file_size_bytes, t.thumbnail_url, t.content_type,
       CASE WHEN a.id IS NOT NULL THEN json_build_object('id', a.id, 'name', a.name, 'image_url', a.image_url, 'bio', a.bio, 'is_verified', a.is_verified, 'status', a.status, 'created_at', a.created_at) ELSE NULL::json END AS madiheen,
       CASE WHEN au.id IS NOT NULL THEN json_build_object('id', au.id, 'name', au.name, 'image_url', au.image_url, 'status', au.status, 'created_at', au.created_at) ELSE NULL::json END AS ruwat,
       CASE WHEN tq.id IS NOT NULL THEN json_build_object('id', tq.id, 'name', tq.name, 'description', tq.description) ELSE NULL::json END AS turuq,
       CASE WHEN f.id IS NOT NULL THEN json_build_object('id', f.id, 'name', f.name, 'description', f.description) ELSE NULL::json END AS funun,
       -- Unified names (appended; what the dashboard reads post-050).
       t.artist_id, t.author_id,
       -- Curation state (appended in 054; admin-only concern).
       COALESCE(c.lyrics_status, 'unreviewed') AS lyrics_status,
       c.audio_quality,
       c.notes AS curation_notes
FROM tracks t
  LEFT JOIN artists a ON t.artist_id = a.id
  LEFT JOIN authors au ON t.author_id = au.id
  LEFT JOIN turuq tq ON t.tariqa_id = tq.id
  LEFT JOIN funun f ON t.fan_id = f.id
  LEFT JOIN track_curation c ON t.id = c.track_id;

COMMIT;
