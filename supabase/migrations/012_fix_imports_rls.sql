-- Migration: Fix pending_imports RLS to allow superusers
-- The original policies only checked for 'admin' role, but superusers should also have access

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all imports" ON pending_imports;
DROP POLICY IF EXISTS "Admins can update imports" ON pending_imports;
DROP POLICY IF EXISTS "Admins can delete imports" ON pending_imports;

-- Recreate policies to include both admin and superuser roles
CREATE POLICY "Admins can view all imports"
ON pending_imports FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superuser')
    )
);

CREATE POLICY "Admins can update imports"
ON pending_imports FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superuser')
    )
);

CREATE POLICY "Admins can delete imports"
ON pending_imports FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superuser')
    )
);
