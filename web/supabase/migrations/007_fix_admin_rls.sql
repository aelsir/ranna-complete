-- Fix RLS policies for user_roles to allow admins to log in
-- Run this in Supabase SQL Editor

-- 1. Allowed reading own role so admins can verify they are admins
DROP POLICY IF EXISTS "Superusers can view roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;

CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- 2. Allow superusers to view ALL roles (to manage them)
CREATE POLICY "Superusers can view all roles" ON user_roles
  FOR SELECT USING (
    is_admin_or_superuser()
  );
