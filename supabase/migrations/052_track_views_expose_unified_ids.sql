-- Migration 052: expose unified artist_id/author_id on the track views
--
-- Background: migration 050 unified the web app onto the real column names
-- artist_id/author_id, but v_tracks / v_tracks_admin (recreated again in 051)
-- still expose ONLY the legacy aliases madih_id/rawi_id. So the dashboard,
-- which reads artist_id/author_id, breaks:
--   * Filtering by artist/author (`.eq("artist_id", ...)` on v_tracks_admin)
--     targets a column that isn't in the view -> no results.
--   * Thumbnail fallback (artists.find(a.id === t.artist_id)) gets undefined
--     -> the artist-image fallback is lost and tracks show the placeholder.
--
-- Fix: surface t.artist_id and t.author_id on both views. The legacy
-- madih_id/rawi_id aliases are KEPT for the currently-deployed Flutter app
-- (which still reads them); drop them in a later migration once mobile is
-- rolled onto artist_id/author_id.
--
-- CREATE OR REPLACE (not DROP) preserves grants. security_invoker=on is
-- respecified to match how 051 created these views. The two new columns are
-- appended at the end of the select list — the only column change CREATE OR
-- REPLACE permits. Definitions otherwise mirror 051 verbatim (post-uploader
-- schema: uploader_id, no reviewed_*/rejection_reason).

BEGIN;

-- Public read view: approved tracks only.
CREATE OR REPLACE VIEW v_tracks WITH (security_invoker = on) AS
SELECT t.id, t.title, t.madih, t.writer, t.audio_url, t.image_url,
       t.artist_id AS madih_id, t.author_id AS rawi_id,
       t.uploader_id, t.status, t.needs_processing,
       t.source_url, t.recording_place, t.tariqa_id, t.fan_id,
       t.play_count, t.duration_seconds, t.is_featured, t.lyrics,
       t.created_at, t.updated_at, t.file_size_bytes, t.thumbnail_url, t.content_type,
       CASE WHEN a.id IS NOT NULL THEN json_build_object('id', a.id, 'name', a.name, 'image_url', a.image_url, 'bio', a.bio, 'birth_year', a.birth_year, 'death_year', a.death_year, 'is_verified', a.is_verified, 'tariqa_id', a.tariqa_id, 'status', a.status, 'created_at', a.created_at) ELSE NULL::json END AS madiheen,
       CASE WHEN au.id IS NOT NULL THEN json_build_object('id', au.id, 'name', au.name, 'image_url', au.image_url, 'bio', au.bio, 'birth_year', au.birth_year, 'death_year', au.death_year, 'status', au.status, 'created_at', au.created_at) ELSE NULL::json END AS ruwat,
       CASE WHEN tq.id IS NOT NULL THEN json_build_object('id', tq.id, 'name', tq.name, 'description', tq.description) ELSE NULL::json END AS turuq,
       CASE WHEN f.id IS NOT NULL THEN json_build_object('id', f.id, 'name', f.name, 'description', f.description) ELSE NULL::json END AS funun,
       -- Unified names (appended; what the web app reads post-050).
       t.artist_id, t.author_id
FROM tracks t
  LEFT JOIN artists a ON t.artist_id = a.id
  LEFT JOIN authors au ON t.author_id = au.id
  LEFT JOIN turuq tq ON t.tariqa_id = tq.id
  LEFT JOIN funun f ON t.fan_id = f.id
WHERE t.status = 'approved';

-- Admin view: all statuses (RLS limits rows to admins).
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
       t.artist_id, t.author_id
FROM tracks t
  LEFT JOIN artists a ON t.artist_id = a.id
  LEFT JOIN authors au ON t.author_id = au.id
  LEFT JOIN turuq tq ON t.tariqa_id = tq.id
  LEFT JOIN funun f ON t.fan_id = f.id;

COMMIT;
