-- Migration: backfill user_profiles for pre-existing auth.users and seed the
-- project owner as a superuser.
--
-- Context:
-- Migration 030 added a trigger that auto-creates user_profiles rows going
-- forward — but any auth.users rows that existed BEFORE 030 landed won't
-- have a matching profile. This migration backfills them.
--
-- It also promotes the project owner to superuser so they can access the
-- admin dashboard (gated by is_admin_or_superuser() from 003_user_roles.sql).
-- user_roles.user_id has a UNIQUE constraint (003:7) so upsert is idempotent.
--
-- To grant additional admins later, run:
--   INSERT INTO user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'person@example.com'
--   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 1. Backfill missing profiles for any auth.users that predate migration 030.
INSERT INTO public.user_profiles (id)
    SELECT id FROM auth.users
    ON CONFLICT (id) DO NOTHING;

-- 2. Promote the project owner. No-op in a fresh dev env where the account
-- hasn't signed in yet — the SELECT returns zero rows.
INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'superuser'
    FROM auth.users
    WHERE email = 'londonstorytellersproject@imix.org.uk'
    ON CONFLICT (user_id) DO UPDATE SET role = 'superuser';
