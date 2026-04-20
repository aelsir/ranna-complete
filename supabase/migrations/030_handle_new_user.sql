-- Migration: auto-create a user_profiles row whenever a new auth.users row is inserted.
--
-- Context:
-- CLAUDE.md documentation references a `handle_new_user` trigger, but no such
-- trigger existed in the migrations — so every auth.users insert left
-- user_profiles empty. Profile-dependent RLS policies (013_schema_enhancements.sql)
-- then failed silently for every new user.
--
-- With anonymous-first auth (config.toml enable_anonymous_sign_ins=true), every
-- first app open creates an auth.users row. We need a matching user_profiles
-- row from the moment the auth row exists.
--
-- The trigger inserts ONLY the id — all other columns on user_profiles are
-- nullable or have DEFAULTs (see migrations 013 + 014 which relaxed constraints).
-- This keeps the trigger safe for anonymous users (no email, no metadata).
--
-- SECURITY DEFINER is required because the trigger fires inside the auth
-- schema (restricted); setting search_path avoids SQL injection via search_path
-- shenanigans.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Drop any pre-existing trigger (idempotent re-run) then create fresh.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
