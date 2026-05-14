-- Migration: Restrict madiheen / ruwat INSERTs to admins only
--
-- Context: Migration 004 allowed any authenticated user to insert rows
-- into madiheen and ruwat with `WITH CHECK (true)`. The original intent
-- was a user-submission-with-approval flow. That flow is paused for now,
-- so we lock INSERTs to admin/superuser roles to prevent spam/abuse
-- (e.g., a signed-up bot flooding the catalog with junk performers).
--
-- ============================================================
-- HOW TO RE-ENABLE USER SUBMISSIONS LATER
-- ============================================================
-- When you're ready to let regular users submit new madiheen/ruwat
-- (subject to admin approval), write a new migration that runs:
--
--   DROP POLICY IF EXISTS "Admins can add madiheen" ON madiheen;
--   DROP POLICY IF EXISTS "Admins can add ruwat"    ON ruwat;
--
--   CREATE POLICY "Authenticated users can add madiheen"
--     ON madiheen FOR INSERT TO authenticated
--     WITH CHECK (auth.uid() = created_by);
--
--   CREATE POLICY "Authenticated users can add ruwat"
--     ON ruwat FOR INSERT TO authenticated
--     WITH CHECK (auth.uid() = created_by);
--
-- Pair that with an `is_approved` / `status` column and admin moderation
-- UI so new rows are pending until an admin approves them.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can add madiheen" ON madiheen;
DROP POLICY IF EXISTS "Authenticated users can add ruwat"    ON ruwat;

CREATE POLICY "Admins can add madiheen"
    ON madiheen FOR INSERT
    TO authenticated
    WITH CHECK (is_admin_or_superuser());

CREATE POLICY "Admins can add ruwat"
    ON ruwat FOR INSERT
    TO authenticated
    WITH CHECK (is_admin_or_superuser());
