-- Migration 051: uploader rename, expanded status, and a review log
--
-- Designed against the live schema (verified via a fresh pg dump, since the
-- migration files had drifted). Changes:
--   1. status gains 'internal' (staff-only) and 'hidden' (temporarily pulled).
--      Only 'approved' reaches end users — enforced by v_tracks' WHERE clause.
--   2. tracks.user_id → uploader_id, with ON DELETE SET NULL (deleting an
--      uploader's account no longer deletes their catalog tracks) + an index
--      for "how many tracks has this user uploaded".
--   3. A new append-only `track_reviews` log. The review metadata currently on
--      `tracks` (reviewed_by / reviewed_at / rejection_reason) is moved here.
--      NOT wired into any promote-to-approve flow yet — the table just exists
--      for future use. No sibling admin/internal-notes table (intentionally).
--
-- ⚠️ VERIFY AFTER APPLYING:
--   * Admin dashboard still lists ALL tracks (incl. pending/rejected).
--   * Public app still loads approved tracks.
--   The views are recreated as security_invoker=on (RLS governs visibility),
--   matching the current reliance on RLS. If your admin dashboard suddenly
--   shows only approved tracks, the admin session isn't carrying the admin
--   role — tell me and we'll adjust.

BEGIN;

-- 1. Expanded status set.
ALTER TABLE tracks DROP CONSTRAINT IF EXISTS madha_status_check;
ALTER TABLE tracks ADD CONSTRAINT tracks_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'internal', 'hidden'));

-- 2. Rename uploader column, safer FK, lookup index.
ALTER TABLE tracks RENAME COLUMN user_id TO uploader_id;
ALTER TABLE tracks DROP CONSTRAINT IF EXISTS madha_user_id_fkey;
ALTER TABLE tracks ADD CONSTRAINT tracks_uploader_id_fkey
  FOREIGN KEY (uploader_id) REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_uploader_id ON tracks (uploader_id);

-- 3. Review log (future moderation; not yet wired up).
CREATE TABLE IF NOT EXISTS track_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id    uuid NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  decision    text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_track_reviews_track_id ON track_reviews (track_id);

COMMENT ON TABLE track_reviews IS
  'Append-only moderation log for user-uploaded tracks: one row per review action. Not yet wired into a promote-to-approve flow — tracks.status is still the source of truth for current state. Created ahead of that feature.';
COMMENT ON COLUMN track_reviews.track_id    IS 'The track that was reviewed.';
COMMENT ON COLUMN track_reviews.reviewer_id IS 'Admin/superuser who made the decision; null if their account was later deleted.';
COMMENT ON COLUMN track_reviews.decision    IS 'Outcome of this review: approved or rejected.';
COMMENT ON COLUMN track_reviews.notes       IS 'Optional reviewer note / rejection reason.';
COMMENT ON COLUMN track_reviews.created_at  IS 'When this review decision was recorded.';

-- 4. Move existing review metadata off tracks into the log (preserve history).
INSERT INTO track_reviews (track_id, reviewer_id, decision, notes, created_at)
SELECT id,
       reviewed_by,
       CASE WHEN status = 'rejected' THEN 'rejected' ELSE 'approved' END,
       rejection_reason,
       COALESCE(reviewed_at, now())
FROM tracks
WHERE reviewed_by IS NOT NULL
   OR reviewed_at IS NOT NULL
   OR rejection_reason IS NOT NULL;

-- 5. Drop the dependent views so the moved columns can be removed.
DROP VIEW IF EXISTS v_tracks;
DROP VIEW IF EXISTS v_tracks_admin;

-- 6. Remove the moved columns from tracks (FK on reviewed_by drops with it).
ALTER TABLE tracks DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE tracks DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE tracks DROP COLUMN IF EXISTS rejection_reason;

-- 7. v_tracks — public read view (approved only). Keeps the historical
--    madih_id/rawi_id aliases the apps read; user_id is now uploader_id.
CREATE VIEW v_tracks WITH (security_invoker = on) AS
SELECT t.id, t.title, t.madih, t.writer, t.audio_url, t.image_url,
       t.artist_id AS madih_id, t.author_id AS rawi_id,
       t.uploader_id, t.status, t.needs_processing,
       t.source_url, t.recording_place, t.tariqa_id, t.fan_id,
       t.play_count, t.duration_seconds, t.is_featured, t.lyrics,
       t.created_at, t.updated_at, t.file_size_bytes, t.thumbnail_url, t.content_type,
       CASE WHEN a.id IS NOT NULL THEN json_build_object('id', a.id, 'name', a.name, 'image_url', a.image_url, 'bio', a.bio, 'birth_year', a.birth_year, 'death_year', a.death_year, 'is_verified', a.is_verified, 'tariqa_id', a.tariqa_id, 'status', a.status, 'created_at', a.created_at) ELSE NULL::json END AS madiheen,
       CASE WHEN au.id IS NOT NULL THEN json_build_object('id', au.id, 'name', au.name, 'image_url', au.image_url, 'bio', au.bio, 'birth_year', au.birth_year, 'death_year', au.death_year, 'status', au.status, 'created_at', au.created_at) ELSE NULL::json END AS ruwat,
       CASE WHEN tq.id IS NOT NULL THEN json_build_object('id', tq.id, 'name', tq.name, 'description', tq.description) ELSE NULL::json END AS turuq,
       CASE WHEN f.id IS NOT NULL THEN json_build_object('id', f.id, 'name', f.name, 'description', f.description) ELSE NULL::json END AS funun
FROM tracks t
  LEFT JOIN artists a ON t.artist_id = a.id
  LEFT JOIN authors au ON t.author_id = au.id
  LEFT JOIN turuq tq ON t.tariqa_id = tq.id
  LEFT JOIN funun f ON t.fan_id = f.id
WHERE t.status = 'approved';

-- 8. v_tracks_admin — admin view, all statuses (RLS limits rows to admins).
CREATE VIEW v_tracks_admin WITH (security_invoker = on) AS
SELECT t.id, t.title, t.madih, t.writer, t.audio_url, t.image_url,
       t.artist_id AS madih_id, t.author_id AS rawi_id,
       t.uploader_id, t.status, t.needs_processing,
       t.source_url, t.recording_place, t.tariqa_id, t.fan_id,
       t.play_count, t.duration_seconds, t.is_featured, t.lyrics,
       t.created_at, t.updated_at, t.file_size_bytes, t.thumbnail_url, t.content_type,
       CASE WHEN a.id IS NOT NULL THEN json_build_object('id', a.id, 'name', a.name, 'image_url', a.image_url, 'bio', a.bio, 'is_verified', a.is_verified, 'status', a.status, 'created_at', a.created_at) ELSE NULL::json END AS madiheen,
       CASE WHEN au.id IS NOT NULL THEN json_build_object('id', au.id, 'name', au.name, 'image_url', au.image_url, 'status', au.status, 'created_at', au.created_at) ELSE NULL::json END AS ruwat,
       CASE WHEN tq.id IS NOT NULL THEN json_build_object('id', tq.id, 'name', tq.name, 'description', tq.description) ELSE NULL::json END AS turuq,
       CASE WHEN f.id IS NOT NULL THEN json_build_object('id', f.id, 'name', f.name, 'description', f.description) ELSE NULL::json END AS funun
FROM tracks t
  LEFT JOIN artists a ON t.artist_id = a.id
  LEFT JOIN authors au ON t.author_id = au.id
  LEFT JOIN turuq tq ON t.tariqa_id = tq.id
  LEFT JOIN funun f ON t.fan_id = f.id;

-- 9. Re-grant (DROP VIEW cleared grants). Mirrors the prior broad Supabase
--    grants; RLS is what actually restricts access.
GRANT ALL ON v_tracks TO anon, authenticated, service_role;
GRANT ALL ON v_tracks_admin TO anon, authenticated, service_role;

-- 10. RLS policies on tracks referenced the renamed column.
DROP POLICY IF EXISTS "Owners can view own madha" ON tracks;
CREATE POLICY "Owners can view own madha" ON tracks FOR SELECT TO public
  USING ((auth.uid() IS NOT NULL) AND (auth.uid() = uploader_id));

DROP POLICY IF EXISTS "Users can update own madha" ON tracks;
CREATE POLICY "Users can update own madha" ON tracks FOR UPDATE TO public
  USING (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "Users or admins can delete madha" ON tracks;
CREATE POLICY "Users or admins can delete madha" ON tracks FOR DELETE TO public
  USING ((auth.uid() = uploader_id) OR is_admin_or_superuser());

-- 11. RLS for the review log: admins only.
ALTER TABLE track_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage track reviews" ON track_reviews FOR ALL TO public
  USING (is_admin_or_superuser()) WITH CHECK (is_admin_or_superuser());
GRANT ALL ON track_reviews TO authenticated, service_role;

COMMIT;
