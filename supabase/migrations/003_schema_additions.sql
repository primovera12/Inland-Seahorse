-- Add missing columns to company_settings for backward compatibility
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS logo_base64 TEXT,
ADD COLUMN IF NOT EXISTS logo_width INTEGER,
ADD COLUMN IF NOT EXISTS logo_height INTEGER,
ADD COLUMN IF NOT EXISTS logo_width_percent INTEGER,
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#ed0c5b',
ADD COLUMN IF NOT EXISTS show_company_address BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_company_phone BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_company_email BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT 'Thank you for your business!',
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS dimension_threshold_length INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS dimension_threshold_width INTEGER DEFAULT 16,
ADD COLUMN IF NOT EXISTS dimension_threshold_height INTEGER DEFAULT 18;

-- Create fuel_surcharge_index table
CREATE TABLE IF NOT EXISTS fuel_surcharge_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date TIMESTAMPTZ NOT NULL,
  doe_price_per_gallon DECIMAL(10,3) NOT NULL,
  surcharge_percent DECIMAL(5,2) NOT NULL,
  region TEXT DEFAULT 'national',
  source_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fuel_surcharge_settings table
CREATE TABLE IF NOT EXISTS fuel_surcharge_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_fuel_price DECIMAL(10,3) DEFAULT 2.500,
  increment_per_cent DECIMAL(5,3) DEFAULT 0.500,
  min_surcharge DECIMAL(5,2) DEFAULT 0.00,
  max_surcharge DECIMAL(5,2) DEFAULT 50.00,
  auto_update_enabled BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create inland_rate_settings table
CREATE TABLE IF NOT EXISTS inland_rate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_rate_per_mile DECIMAL(10,2) DEFAULT 3.50,
  minimum_charge DECIMAL(10,2) DEFAULT 350.00,
  fuel_surcharge_enabled BOOLEAN DEFAULT TRUE,
  fuel_surcharge_percent DECIMAL(5,2) DEFAULT 15.00,
  default_margin_percent DECIMAL(5,2) DEFAULT 15.00,
  default_validity_days INTEGER DEFAULT 7,
  rate_tiers JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create permit_types table
CREATE TABLE IF NOT EXISTS permit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  typical_cost DECIMAL(10,2) DEFAULT 0.00,
  typical_processing_days INTEGER DEFAULT 1,
  required_for_overweight BOOLEAN DEFAULT FALSE,
  required_for_oversize BOOLEAN DEFAULT FALSE,
  states_required TEXT[] DEFAULT ARRAY['ALL'],
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create inland_service_types table
CREATE TABLE IF NOT EXISTS inland_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_price DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create inland_load_types table
CREATE TABLE IF NOT EXISTS inland_load_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create equipment_types table (dismantling equipment categories)
CREATE TABLE IF NOT EXISTS equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create custom_fields table
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multiselect')),
  display_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  validation_regex TEXT,
  options JSONB,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'question')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  page TEXT,
  screenshot_base64 TEXT,
  user_id UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for new tables
ALTER TABLE fuel_surcharge_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_surcharge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_rate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_load_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read these reference tables
CREATE POLICY "Allow authenticated read on fuel_surcharge_index" ON fuel_surcharge_index FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on fuel_surcharge_settings" ON fuel_surcharge_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on inland_rate_settings" ON inland_rate_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on permit_types" ON permit_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on inland_service_types" ON inland_service_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on inland_load_types" ON inland_load_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on equipment_types" ON equipment_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on custom_fields" ON custom_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on tickets" ON tickets FOR SELECT TO authenticated USING (true);

-- Allow admin users to manage these tables
CREATE POLICY "Allow admin write on fuel_surcharge_index" ON fuel_surcharge_index FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Allow admin write on fuel_surcharge_settings" ON fuel_surcharge_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Allow admin write on inland_rate_settings" ON inland_rate_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Allow admin write on permit_types" ON permit_types FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Allow admin write on inland_service_types" ON inland_service_types FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Allow admin write on inland_load_types" ON inland_load_types FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Allow admin write on equipment_types" ON equipment_types FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Allow admin write on custom_fields" ON custom_fields FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Users can create tickets, view own tickets, admins can see all
CREATE POLICY "Users can create tickets" ON tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view own tickets" ON tickets FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can manage tickets" ON tickets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
