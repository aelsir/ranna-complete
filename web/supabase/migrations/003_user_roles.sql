-- User Roles and Permissions Migration
-- Run this in your Supabase SQL Editor

-- Create user roles table
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('superuser', 'admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Only superusers can view roles
CREATE POLICY "Superusers can view roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'superuser'
    )
  );

-- Only superusers can manage roles
CREATE POLICY "Superusers can manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'superuser'
    )
  );

-- Helper function to check if user is superuser or admin
CREATE OR REPLACE FUNCTION is_admin_or_superuser()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('superuser', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update madha delete policy to allow superusers/admins
DROP POLICY IF EXISTS "Users can delete own madha" ON madha;
CREATE POLICY "Users or admins can delete madha" ON madha
  FOR DELETE USING (
    auth.uid() = user_id 
    OR is_admin_or_superuser()
  );

-- Add approval status to madha (for future use)
ALTER TABLE madha ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' 
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- =====================================================
-- IMPORTANT: After running this migration, make yourself a superuser
-- =====================================================
-- Step 1: Find your user ID
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Insert yourself as superuser (replace YOUR_USER_ID)
-- INSERT INTO user_roles (user_id, role) VALUES ('YOUR_USER_ID', 'superuser');
