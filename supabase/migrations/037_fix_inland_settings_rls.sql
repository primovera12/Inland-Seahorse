-- ============================================
-- FIX: Inland Settings Tables - Restrict writes to admins only
-- ============================================
-- This migration updates RLS policies for inland configuration tables
-- to only allow admin/owner/super_admin users to modify settings.
-- This matches the security model of company_settings.
--
-- Tables affected:
-- - inland_equipment_types
-- - inland_accessorial_types
-- - inland_service_types
-- - inland_rate_tiers

-- ============================================
-- FIX: inland_equipment_types - Restrict writes to admins
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage equipment types" ON inland_equipment_types;

-- Keep read access for all authenticated users
CREATE POLICY "Authenticated users can view equipment types" ON inland_equipment_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert equipment types
CREATE POLICY "Admins can insert equipment types" ON inland_equipment_types
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

-- Only admins can update equipment types
CREATE POLICY "Admins can update equipment types" ON inland_equipment_types
  FOR UPDATE
  TO authenticated
  USING (is_admin_user());

-- Only admins can delete equipment types
CREATE POLICY "Admins can delete equipment types" ON inland_equipment_types
  FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- ============================================
-- FIX: inland_accessorial_types - Restrict writes to admins
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage accessorial types" ON inland_accessorial_types;

-- Keep read access for all authenticated users
CREATE POLICY "Authenticated users can view accessorial types" ON inland_accessorial_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert accessorial types
CREATE POLICY "Admins can insert accessorial types" ON inland_accessorial_types
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

-- Only admins can update accessorial types
CREATE POLICY "Admins can update accessorial types" ON inland_accessorial_types
  FOR UPDATE
  TO authenticated
  USING (is_admin_user());

-- Only admins can delete accessorial types
CREATE POLICY "Admins can delete accessorial types" ON inland_accessorial_types
  FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- ============================================
-- FIX: inland_service_types - Restrict writes to admins
-- ============================================
DROP POLICY IF EXISTS "Anyone can read service types" ON inland_service_types;
DROP POLICY IF EXISTS "Authenticated users can insert service types" ON inland_service_types;
DROP POLICY IF EXISTS "Authenticated users can update service types" ON inland_service_types;

-- Keep read access for all authenticated users
CREATE POLICY "Authenticated users can view service types" ON inland_service_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert service types
CREATE POLICY "Admins can insert service types" ON inland_service_types
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

-- Only admins can update service types
CREATE POLICY "Admins can update service types" ON inland_service_types
  FOR UPDATE
  TO authenticated
  USING (is_admin_user());

-- Only admins can delete service types
CREATE POLICY "Admins can delete service types" ON inland_service_types
  FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- ============================================
-- FIX: inland_rate_tiers - Restrict writes to admins
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage rate tiers" ON inland_rate_tiers;

-- Keep read access for all authenticated users
CREATE POLICY "Authenticated users can view rate tiers" ON inland_rate_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert rate tiers
CREATE POLICY "Admins can insert rate tiers" ON inland_rate_tiers
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

-- Only admins can update rate tiers
CREATE POLICY "Admins can update rate tiers" ON inland_rate_tiers
  FOR UPDATE
  TO authenticated
  USING (is_admin_user());

-- Only admins can delete rate tiers
CREATE POLICY "Admins can delete rate tiers" ON inland_rate_tiers
  FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- ============================================
-- Add comments
-- ============================================
COMMENT ON POLICY "Admins can insert equipment types" ON inland_equipment_types IS 'Only admin, owner, or super_admin can add equipment types';
COMMENT ON POLICY "Admins can update equipment types" ON inland_equipment_types IS 'Only admin, owner, or super_admin can modify equipment types';
COMMENT ON POLICY "Admins can insert service types" ON inland_service_types IS 'Only admin, owner, or super_admin can add service types';
COMMENT ON POLICY "Admins can update service types" ON inland_service_types IS 'Only admin, owner, or super_admin can modify service types';
