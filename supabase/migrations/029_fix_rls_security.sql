-- ============================================
-- SECURITY FIX: RLS Policy Improvements
-- ============================================
-- This migration fixes critical security issues with overly permissive RLS policies.
-- Previously, many policies used USING (true) which allowed any authenticated user
-- to access/modify all data. This migration implements proper role-based access.
--
-- Role Hierarchy (higher = more permissions):
-- - viewer (0): Read-only access
-- - member (1): Can create and edit own content
-- - manager (2): Can manage content and some team functions
-- - admin (3): Full access except super_admin functions
-- - owner (4): Full access
-- - super_admin (5): Full access including system management

-- ============================================
-- HELPER FUNCTION: Check if user has admin role
-- ============================================
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'owner')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Check if user has manager+ role
-- ============================================
CREATE OR REPLACE FUNCTION is_manager_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('manager', 'admin', 'super_admin', 'owner')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX: users table - Restrict delete to admins only
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can delete team members" ON users;

CREATE POLICY "Admins can delete lower-role users" ON users
  FOR DELETE
  TO authenticated
  USING (
    -- Must be admin or higher
    is_admin_user()
    -- Cannot delete yourself
    AND id != auth.uid()
    -- Cannot delete super_admin (unless you are super_admin)
    AND (
      role != 'super_admin'
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'super_admin'
      )
    )
  );

-- ============================================
-- FIX: company_settings - Restrict to admins only
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON company_settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON company_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON company_settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON company_settings;

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can view settings" ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can update settings" ON company_settings
  FOR UPDATE
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Admins can insert settings" ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

-- ============================================
-- FIX: audit_log - Restrict access and prevent deletion
-- (Only if table exists - created in migration 020)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_log;
    DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_log;
    DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_log;
    DROP POLICY IF EXISTS "Authenticated users can delete audit logs" ON audit_log;

    -- Only admins can view all audit logs, others see their own
    CREATE POLICY "Users can view relevant audit logs" ON audit_log
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid()
        OR is_admin_user()
      );

    -- All authenticated users can create audit log entries
    CREATE POLICY "Authenticated users can insert audit logs" ON audit_log
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    -- No DELETE policy = denied by default (immutable audit log)
  END IF;
END $$;

-- ============================================
-- FIX: company_rate_cards - Restrict writes to managers+
-- (Only if table exists - created in migration 018)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_rate_cards') THEN
    DROP POLICY IF EXISTS "Authenticated users can manage rate cards" ON company_rate_cards;
    DROP POLICY IF EXISTS "Authenticated users can view rate cards" ON company_rate_cards;
    DROP POLICY IF EXISTS "Authenticated users can update rate cards" ON company_rate_cards;
    DROP POLICY IF EXISTS "Authenticated users can insert rate cards" ON company_rate_cards;
    DROP POLICY IF EXISTS "Authenticated users can delete rate cards" ON company_rate_cards;

    -- All authenticated users can read rate cards
    CREATE POLICY "Authenticated users can view rate cards" ON company_rate_cards
      FOR SELECT
      TO authenticated
      USING (true);

    -- Only managers and above can modify rate cards
    CREATE POLICY "Managers can update rate cards" ON company_rate_cards
      FOR UPDATE
      TO authenticated
      USING (is_manager_or_above());

    CREATE POLICY "Managers can insert rate cards" ON company_rate_cards
      FOR INSERT
      TO authenticated
      WITH CHECK (is_manager_or_above());

    CREATE POLICY "Admins can delete rate cards" ON company_rate_cards
      FOR DELETE
      TO authenticated
      USING (is_admin_user());
  END IF;
END $$;

-- ============================================
-- FIX: role_permissions - Restrict to admins
-- (Only if table exists - created in migration 020)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    DROP POLICY IF EXISTS "Authenticated users can view permissions" ON role_permissions;
    DROP POLICY IF EXISTS "Authenticated users can manage permissions" ON role_permissions;

    -- All authenticated users can view permissions
    CREATE POLICY "Authenticated users can view permissions" ON role_permissions
      FOR SELECT
      TO authenticated
      USING (true);

    -- Only admins can modify permissions
    CREATE POLICY "Admins can manage permissions" ON role_permissions
      FOR INSERT
      TO authenticated
      WITH CHECK (is_admin_user());

    CREATE POLICY "Admins can update permissions" ON role_permissions
      FOR UPDATE
      TO authenticated
      USING (is_admin_user());

    CREATE POLICY "Admins can delete permissions" ON role_permissions
      FOR DELETE
      TO authenticated
      USING (is_admin_user());
  END IF;
END $$;

-- ============================================
-- FIX: user_roles - Restrict management to admins
-- (Only if table exists - created in migration 020)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
    DROP POLICY IF EXISTS "Authenticated users can manage user roles" ON user_roles;

    -- All authenticated users can view roles
    CREATE POLICY "Authenticated users can view user roles" ON user_roles
      FOR SELECT
      TO authenticated
      USING (true);

    -- Only admins can modify roles
    CREATE POLICY "Admins can manage user roles" ON user_roles
      FOR INSERT
      TO authenticated
      WITH CHECK (is_admin_user());

    CREATE POLICY "Admins can update user roles" ON user_roles
      FOR UPDATE
      TO authenticated
      USING (is_admin_user());

    CREATE POLICY "Admins can delete user roles" ON user_roles
      FOR DELETE
      TO authenticated
      USING (is_admin_user());
  END IF;
END $$;

-- ============================================
-- Add comments about RLS improvements
-- ============================================
COMMENT ON FUNCTION is_admin_user() IS 'Helper function to check if current user has admin, super_admin, or owner role';
COMMENT ON FUNCTION is_manager_or_above() IS 'Helper function to check if current user has manager or higher role';
