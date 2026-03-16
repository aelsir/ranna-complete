-- Fix RLS policies for unauthenticated users
-- Run this in Supabase SQL Editor
-- This fixes the issue where madih/rawi pages require login

-- =====================================================
-- 1. Fix madiheen RLS to work for anonymous users
-- =====================================================

DROP POLICY IF EXISTS "Public approved, own, or admin" ON madiheen;

-- Simpler policies that don't fail for anonymous users
CREATE POLICY "Anyone can view approved madiheen" ON madiheen
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Owners can view own madiheen" ON madiheen
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Admins can view all madiheen" ON madiheen
  FOR SELECT USING (is_admin_or_superuser());

-- =====================================================
-- 2. Fix ruwat RLS to work for anonymous users
-- =====================================================

DROP POLICY IF EXISTS "Public approved, own, or admin" ON ruwat;

CREATE POLICY "Anyone can view approved ruwat" ON ruwat
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Owners can view own ruwat" ON ruwat
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Admins can view all ruwat" ON ruwat
  FOR SELECT USING (is_admin_or_superuser());

-- =====================================================
-- 3. Fix madha RLS to work for anonymous users
-- =====================================================

DROP POLICY IF EXISTS "Public approved, own, or admin" ON madha;
DROP POLICY IF EXISTS "Public can view approved madha" ON madha;
DROP POLICY IF EXISTS "Users can view own madha" ON madha;
DROP POLICY IF EXISTS "Admins can view all madha" ON madha;

CREATE POLICY "Anyone can view approved madha" ON madha
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Owners can view own madha" ON madha
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all madha" ON madha
  FOR SELECT USING (is_admin_or_superuser());

-- =====================================================
-- Done! Anonymous users can now view approved content
-- =====================================================
