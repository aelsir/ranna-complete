-- Migration 050: Drop the legacy alias shim
--
-- Background: migration 025 renamed madha→tracks, madiheen→artists,
-- ruwat→authors (and columns madih_id→artist_id, rawi_id→author_id), keeping
-- the old names as writable alias VIEWS backed by INSTEAD-OF triggers so the
-- web admin could keep using them. The web app has now been migrated to the
-- real table/column names, so the shim is dead weight (and its triggers have
-- needed fixes before — migrations 026/027).
--
-- Preconditions (verified before writing this migration):
--   * No function or view queries FROM madha/madiheen/ruwat.
--   * The Flutter app reads only the v_* views.
--   * The web app no longer references the alias names (tsc passes).
--
-- ROLLOUT ORDER: deploy the updated web app FIRST, then run this migration.
-- The new web code targets tracks/artists/authors, which already exist, so it
-- works against the current database before this runs.

-- 1. Drop the alias views. CASCADE removes their INSTEAD-OF triggers too.
DROP VIEW IF EXISTS madha CASCADE;
DROP VIEW IF EXISTS madiheen CASCADE;
DROP VIEW IF EXISTS ruwat CASCADE;

-- 2. Drop the now-orphaned trigger functions.
DROP FUNCTION IF EXISTS madha_alias_insert_fn();
DROP FUNCTION IF EXISTS madha_alias_update_fn();
DROP FUNCTION IF EXISTS madha_alias_delete_fn();
DROP FUNCTION IF EXISTS madiheen_alias_insert_fn();
DROP FUNCTION IF EXISTS madiheen_alias_update_fn();
DROP FUNCTION IF EXISTS madiheen_alias_delete_fn();
DROP FUNCTION IF EXISTS ruwat_alias_insert_fn();
DROP FUNCTION IF EXISTS ruwat_alias_update_fn();
DROP FUNCTION IF EXISTS ruwat_alias_delete_fn();
