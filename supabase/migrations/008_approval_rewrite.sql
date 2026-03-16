-- Approval Workflow Rewrite Migration
-- Run this in Supabase SQL Editor
-- This consolidates and fixes all approval-related changes

-- =====================================================
-- 1. SECURITY DEFINER function to check user role (bypasses RLS)
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_role(check_user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = check_user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Wrapper for current user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT get_user_role(auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if current user is admin or superuser
CREATE OR REPLACE FUNCTION is_admin_or_superuser()
RETURNS BOOLEAN AS $$
  SELECT get_user_role(auth.uid()) IN ('admin', 'superuser');
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- 2. Fix user_roles RLS policies
-- =====================================================

-- Drop old problematic policies
DROP POLICY IF EXISTS "Superusers can view roles" ON user_roles;
DROP POLICY IF EXISTS "Superusers can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Superusers can view all roles" ON user_roles;

-- Simple policy: users can read their own role
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Superusers can manage all roles
CREATE POLICY "Superusers can manage all roles" ON user_roles
  FOR ALL USING (get_user_role(auth.uid()) = 'superuser');

-- =====================================================
-- 3. Add rejection_reason column to madha
-- =====================================================

ALTER TABLE madha ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- =====================================================
-- 4. Ensure madha has correct columns and defaults
-- =====================================================

-- Status column (may already exist)
ALTER TABLE madha ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE madha ALTER COLUMN status SET DEFAULT 'pending';

-- Review metadata
ALTER TABLE madha ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE madha ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- =====================================================
-- 5. Clean up madha RLS policies
-- =====================================================

-- Drop all existing madha SELECT policies
DROP POLICY IF EXISTS "Anyone can view madha" ON madha;
DROP POLICY IF EXISTS "Public approved, own, or admin" ON madha;
DROP POLICY IF EXISTS "Admins can update madha status" ON madha;

-- Public sees approved only
CREATE POLICY "Public can view approved madha" ON madha
  FOR SELECT USING (status = 'approved');

-- Users can view their own uploads (any status)
CREATE POLICY "Users can view own madha" ON madha
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all madha
CREATE POLICY "Admins can view all madha" ON madha
  FOR SELECT USING (is_admin_or_superuser());

-- Admins can update madha (for approving/rejecting)
CREATE POLICY "Admins can update madha" ON madha
  FOR UPDATE USING (is_admin_or_superuser());

-- =====================================================
-- 6. Set all existing madha to approved (grandfathered in)
-- =====================================================

UPDATE madha SET status = 'approved' WHERE status IS NULL;

-- =====================================================
-- DONE! Now run these verification queries:
-- =====================================================

-- Check your role:
-- SELECT get_my_role();

-- Check if admin function works:
-- SELECT is_admin_or_superuser();
