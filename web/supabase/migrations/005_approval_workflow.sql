-- Approval Workflow Migration
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. Add status to madiheen and ruwat tables
-- =====================================================

ALTER TABLE madiheen ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE ruwat ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- =====================================================
-- 2. Add review metadata columns
-- =====================================================

-- For madha (status column already exists from 003_user_roles.sql)
ALTER TABLE madha ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE madha ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- For madiheen
ALTER TABLE madiheen ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE madiheen ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- For ruwat
ALTER TABLE ruwat ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE ruwat ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- =====================================================
-- 3. Update default status for new uploads to 'pending'
-- =====================================================

ALTER TABLE madha ALTER COLUMN status SET DEFAULT 'pending';

-- =====================================================
-- 4. Update RLS Policies for madha
-- =====================================================

-- Drop old public read policy
DROP POLICY IF EXISTS "Anyone can view madha" ON madha;

-- New policy: Public sees approved, uploaders see own, admins see all
CREATE POLICY "Public approved, own, or admin" ON madha
  FOR SELECT USING (
    status = 'approved' 
    OR auth.uid() = user_id 
    OR is_admin_or_superuser()
  );

-- =====================================================
-- 5. RLS Policies for madiheen
-- =====================================================

-- Drop old policy if exists
DROP POLICY IF EXISTS "Anyone can view madiheen" ON madiheen;

-- New policy
CREATE POLICY "Public approved, own, or admin" ON madiheen
  FOR SELECT USING (
    status = 'approved' 
    OR auth.uid() = created_by 
    OR is_admin_or_superuser()
  );

-- =====================================================
-- 6. RLS Policies for ruwat
-- =====================================================

-- Drop old policy if exists
DROP POLICY IF EXISTS "Anyone can view ruwat" ON ruwat;

-- New policy
CREATE POLICY "Public approved, own, or admin" ON ruwat
  FOR SELECT USING (
    status = 'approved' 
    OR auth.uid() = created_by 
    OR is_admin_or_superuser()
  );

-- =====================================================
-- 7. Admin update policies
-- =====================================================

-- Allow admins to update status on madha
DROP POLICY IF EXISTS "Admins can update madha status" ON madha;
CREATE POLICY "Admins can update madha status" ON madha
  FOR UPDATE USING (is_admin_or_superuser());

-- Allow admins to update madiheen
DROP POLICY IF EXISTS "Admins can update madiheen" ON madiheen;
CREATE POLICY "Admins can update madiheen" ON madiheen
  FOR UPDATE USING (is_admin_or_superuser());

-- Allow admins to update ruwat
DROP POLICY IF EXISTS "Admins can update ruwat" ON ruwat;
CREATE POLICY "Admins can update ruwat" ON ruwat
  FOR UPDATE USING (is_admin_or_superuser());
