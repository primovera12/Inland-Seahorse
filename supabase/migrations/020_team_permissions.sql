-- Phase 6: Team & Permissions Migration
-- Permission Matrix, Quote Assignment, Audit Logging

-- Add assignee fields to quotes
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

-- Create permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,

  -- Entity permissions (CRUD)
  entity TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,

  -- Special permissions
  can_assign BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  can_send BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(role, entity)
);

-- Create audit log table (enhanced version)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,

  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,

  old_data JSONB,
  new_data JSONB,
  changes JSONB,

  ip_address TEXT,
  user_agent TEXT,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user role assignments table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quote_history_assigned ON quote_history(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_assigned ON inland_quotes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Permissions viewable by all authenticated users
CREATE POLICY "Authenticated users can view permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify permissions (handled in application layer)
CREATE POLICY "Users can view their own audit logs"
  ON audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all audit logs (handled in application layer with bypass)
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default roles and permissions
INSERT INTO role_permissions (role, entity, can_view, can_create, can_edit, can_delete, can_assign, can_export, can_send)
VALUES
  -- Admin - full access
  ('admin', 'quotes', true, true, true, true, true, true, true),
  ('admin', 'inland_quotes', true, true, true, true, true, true, true),
  ('admin', 'companies', true, true, true, true, false, true, false),
  ('admin', 'contacts', true, true, true, true, false, true, false),
  ('admin', 'equipment', true, true, true, true, false, true, false),
  ('admin', 'templates', true, true, true, true, false, true, false),
  ('admin', 'team', true, true, true, true, false, false, false),
  ('admin', 'settings', true, true, true, true, false, false, false),
  ('admin', 'reports', true, false, false, false, false, true, false),
  ('admin', 'analytics', true, false, false, false, false, true, false),

  -- Manager - can do most things except team management
  ('manager', 'quotes', true, true, true, true, true, true, true),
  ('manager', 'inland_quotes', true, true, true, true, true, true, true),
  ('manager', 'companies', true, true, true, false, false, true, false),
  ('manager', 'contacts', true, true, true, false, false, true, false),
  ('manager', 'equipment', true, true, true, false, false, true, false),
  ('manager', 'templates', true, true, true, false, false, false, false),
  ('manager', 'team', true, false, false, false, false, false, false),
  ('manager', 'settings', true, true, false, false, false, false, false),
  ('manager', 'reports', true, false, false, false, false, true, false),
  ('manager', 'analytics', true, false, false, false, false, true, false),

  -- Member - standard access
  ('member', 'quotes', true, true, true, false, false, true, true),
  ('member', 'inland_quotes', true, true, true, false, false, true, true),
  ('member', 'companies', true, true, true, false, false, false, false),
  ('member', 'contacts', true, true, true, false, false, false, false),
  ('member', 'equipment', true, false, false, false, false, false, false),
  ('member', 'templates', true, false, false, false, false, false, false),
  ('member', 'team', false, false, false, false, false, false, false),
  ('member', 'settings', false, false, false, false, false, false, false),
  ('member', 'reports', true, false, false, false, false, false, false),
  ('member', 'analytics', true, false, false, false, false, false, false),

  -- Viewer - read only
  ('viewer', 'quotes', true, false, false, false, false, false, false),
  ('viewer', 'inland_quotes', true, false, false, false, false, false, false),
  ('viewer', 'companies', true, false, false, false, false, false, false),
  ('viewer', 'contacts', true, false, false, false, false, false, false),
  ('viewer', 'equipment', true, false, false, false, false, false, false),
  ('viewer', 'templates', true, false, false, false, false, false, false),
  ('viewer', 'team', false, false, false, false, false, false, false),
  ('viewer', 'settings', false, false, false, false, false, false, false),
  ('viewer', 'reports', true, false, false, false, false, false, false),
  ('viewer', 'analytics', true, false, false, false, false, false, false)
ON CONFLICT (role, entity) DO NOTHING;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_user_email TEXT;
  v_changes JSONB;
  v_audit_id UUID;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;

  -- Calculate changes if both old and new data provided
  IF p_old_data IS NOT NULL AND p_new_data IS NOT NULL THEN
    SELECT jsonb_object_agg(key, jsonb_build_object('old', p_old_data->key, 'new', value))
    INTO v_changes
    FROM jsonb_each(p_new_data)
    WHERE p_old_data->key IS DISTINCT FROM value;
  END IF;

  -- Insert audit record
  INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, old_data, new_data, changes, metadata)
  VALUES (p_user_id, v_user_email, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data, v_changes, p_metadata)
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Assign admin role to existing users (first user becomes admin)
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- Assign member role to all other users
INSERT INTO user_roles (user_id, role)
SELECT id, 'member'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT (user_id) DO NOTHING;
