-- Dismantle Pro Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'owner', 'admin', 'manager', 'member', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CRM - COMPANIES & CONTACTS
-- ============================================

-- Companies (unified customer entity)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,

  -- Primary address
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Billing address
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,

  -- Business info
  payment_terms TEXT DEFAULT 'Net 30',
  tax_id TEXT,
  credit_limit INTEGER DEFAULT 0, -- cents
  account_number TEXT,

  -- Categorization
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect', 'lead', 'vip')),

  -- Stats (denormalized for performance)
  total_quotes INTEGER NOT NULL DEFAULT 0,
  total_revenue INTEGER NOT NULL DEFAULT 0, -- cents
  last_quote_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  title TEXT,
  role TEXT NOT NULL DEFAULT 'general' CHECK (role IN ('general', 'decision_maker', 'billing', 'operations', 'technical')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'quote_sent', 'quote_accepted', 'quote_rejected', 'follow_up')),
  subject TEXT NOT NULL,
  description TEXT,
  related_quote_id UUID,
  related_inland_quote_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Follow-up reminders
CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  related_quote_id UUID,
  related_activity_id UUID REFERENCES activity_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- EQUIPMENT
-- ============================================

-- Equipment makes
CREATE TABLE IF NOT EXISTS makes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  popularity_rank INTEGER DEFAULT 999,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Equipment models
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make_id UUID NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(make_id, name)
);

-- Equipment dimensions
CREATE TABLE IF NOT EXISTS equipment_dimensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE UNIQUE,
  length_inches INTEGER NOT NULL DEFAULT 0,
  width_inches INTEGER NOT NULL DEFAULT 0,
  height_inches INTEGER NOT NULL DEFAULT 0,
  weight_lbs INTEGER NOT NULL DEFAULT 0,
  front_image_url TEXT,
  side_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rate locations
CREATE TYPE location_name AS ENUM ('New Jersey', 'Savannah', 'Houston', 'Chicago', 'Oakland', 'Long Beach');

-- Equipment rates (per location)
CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make_id UUID NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  location location_name NOT NULL,

  -- All costs in cents
  dismantling_loading_cost INTEGER NOT NULL DEFAULT 0,
  loading_cost INTEGER NOT NULL DEFAULT 0,
  blocking_bracing_cost INTEGER NOT NULL DEFAULT 0,
  rigging_cost INTEGER NOT NULL DEFAULT 0,
  storage_cost INTEGER NOT NULL DEFAULT 0,
  transport_cost INTEGER NOT NULL DEFAULT 0,
  equipment_cost INTEGER NOT NULL DEFAULT 0,
  labor_cost INTEGER NOT NULL DEFAULT 0,
  permit_cost INTEGER NOT NULL DEFAULT 0,
  escort_cost INTEGER NOT NULL DEFAULT 0,
  miscellaneous_cost INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_id, location)
);

-- ============================================
-- QUOTES
-- ============================================

-- Quote history
CREATE TABLE IF NOT EXISTS quote_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  -- Customer info
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_company TEXT,

  -- Equipment info
  make_id UUID REFERENCES makes(id) ON DELETE SET NULL,
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  make_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  location location_name NOT NULL,

  -- Totals (cents)
  subtotal INTEGER NOT NULL DEFAULT 0,
  margin_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  margin_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,

  -- Full quote data as JSON
  quote_data JSONB NOT NULL,

  -- Timestamps
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quote drafts (auto-save)
CREATE TABLE IF NOT EXISTS quote_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_data JSONB NOT NULL,
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INLAND TRANSPORTATION
-- ============================================

-- Equipment types (trucks)
CREATE TABLE IF NOT EXISTS inland_equipment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  max_length_inches INTEGER NOT NULL,
  max_width_inches INTEGER NOT NULL,
  max_height_inches INTEGER NOT NULL,
  max_weight_lbs INTEGER NOT NULL,
  legal_length_inches INTEGER NOT NULL,
  legal_width_inches INTEGER NOT NULL,
  legal_height_inches INTEGER NOT NULL,
  legal_weight_lbs INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accessorial types
CREATE TABLE IF NOT EXISTS inland_accessorial_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_rate INTEGER NOT NULL DEFAULT 0, -- cents
  billing_unit TEXT NOT NULL DEFAULT 'flat' CHECK (billing_unit IN ('flat', 'hour', 'day', 'way', 'week', 'month', 'stop')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved lanes (frequent routes)
CREATE TABLE IF NOT EXISTS inland_saved_lanes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_city TEXT,
  pickup_state TEXT,
  pickup_place_id TEXT,
  dropoff_address TEXT NOT NULL,
  dropoff_city TEXT,
  dropoff_state TEXT,
  dropoff_place_id TEXT,
  distance_miles INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rate tiers (distance-based pricing)
CREATE TABLE IF NOT EXISTS inland_rate_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  min_miles INTEGER NOT NULL,
  max_miles INTEGER NOT NULL,
  rate_per_mile INTEGER NOT NULL, -- cents
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inland quotes
CREATE TABLE IF NOT EXISTS inland_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  -- Customer info
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_company TEXT,

  -- Totals (cents)
  subtotal INTEGER NOT NULL DEFAULT 0,
  margin_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  margin_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,

  -- Full quote data as JSON (includes destination blocks, load blocks, etc.)
  quote_data JSONB NOT NULL,

  -- Timestamps
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SETTINGS
-- ============================================

-- Company settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Company info
  company_name TEXT NOT NULL DEFAULT 'Dismantle Pro',
  company_logo_url TEXT,
  logo_size_percentage INTEGER NOT NULL DEFAULT 100,

  -- Contact info
  company_address TEXT,
  company_city TEXT,
  company_state TEXT,
  company_zip TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,

  -- Branding
  primary_color TEXT NOT NULL DEFAULT '#6366F1',
  secondary_color TEXT,

  -- Quote settings
  default_payment_terms TEXT NOT NULL DEFAULT 'Net 30',
  quote_validity_days INTEGER NOT NULL DEFAULT 30,
  default_margin_percentage DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  quote_prefix TEXT NOT NULL DEFAULT 'QT',

  -- Fuel surcharge
  fuel_surcharge_enabled BOOLEAN NOT NULL DEFAULT false,
  fuel_surcharge_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  doe_price_threshold INTEGER NOT NULL DEFAULT 0, -- cents per gallon

  -- Notifications
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_email TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_models_make_id ON models(make_id);
CREATE INDEX IF NOT EXISTS idx_rates_model_id ON rates(model_id);
CREATE INDEX IF NOT EXISTS idx_rates_location ON rates(location);
CREATE INDEX IF NOT EXISTS idx_quote_history_status ON quote_history(status);
CREATE INDEX IF NOT EXISTS idx_quote_history_company_id ON quote_history(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_created_at ON quote_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_status ON inland_quotes(status);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_created_at ON inland_quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_makes_updated_at BEFORE UPDATE ON makes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_dimensions_updated_at BEFORE UPDATE ON equipment_dimensions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rates_updated_at BEFORE UPDATE ON rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quote_history_updated_at BEFORE UPDATE ON quote_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inland_quotes_updated_at BEFORE UPDATE ON inland_quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_accessorial_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_saved_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_rate_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view companies" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert companies" ON companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update companies" ON companies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete companies" ON companies FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view contacts" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contacts" ON contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contacts" ON contacts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view activity logs" ON activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert activity logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view reminders" ON follow_up_reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage reminders" ON follow_up_reminders FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view makes" ON makes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage makes" ON makes FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view models" ON models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage models" ON models FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view dimensions" ON equipment_dimensions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage dimensions" ON equipment_dimensions FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view rates" ON rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage rates" ON rates FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view quote history" ON quote_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage quote history" ON quote_history FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can manage own drafts" ON quote_drafts FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view equipment types" ON inland_equipment_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage equipment types" ON inland_equipment_types FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view accessorial types" ON inland_accessorial_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage accessorial types" ON inland_accessorial_types FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view saved lanes" ON inland_saved_lanes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage saved lanes" ON inland_saved_lanes FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view rate tiers" ON inland_rate_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage rate tiers" ON inland_rate_tiers FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view inland quotes" ON inland_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage inland quotes" ON inland_quotes FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view settings" ON company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage settings" ON company_settings FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view audit logs" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
