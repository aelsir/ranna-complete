-- Migration: Drop legacy Supabase storage policies
--
-- Context: Ranna no longer uses Supabase Storage. All audio/image assets
-- live in Cloudflare R2 and Backblaze B2. The `audio` and `images` buckets
-- have been removed from the Supabase project, but the RLS policies
-- created in migration 002 may remain as orphans on storage.objects.
--
-- This migration drops those policies so the schema reflects reality.
-- `IF EXISTS` makes it safe to run regardless of current state.

DROP POLICY IF EXISTS "Public audio access"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated audio upload"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated audio update"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated audio delete"   ON storage.objects;

DROP POLICY IF EXISTS "Public images access"         ON storage.objects;
DROP POLICY IF EXISTS "Authenticated images upload"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated images update"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated images delete"  ON storage.objects;
