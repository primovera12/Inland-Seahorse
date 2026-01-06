-- ============================================================
-- INLAND TRANSPORTATION QUOTES SCHEMA
-- ============================================================
-- Core tables for inland transportation quoting system
-- Supports Google Places API and Routes API integration
-- ============================================================

-- ============================================================
-- 0. CUSTOMERS TABLE - Client management
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster customer lookup
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ============================================================
-- 1. INLAND QUOTES - Main table for transportation quotes
-- ============================================================
CREATE TABLE IF NOT EXISTS inland_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number VARCHAR(50) NOT NULL UNIQUE,

  -- Client Information
  client_name VARCHAR(255) NOT NULL,
  client_company VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(50),

  -- Billing Information
  billing_address TEXT,
  billing_city VARCHAR(100),
  billing_state VARCHAR(50),
  billing_zip VARCHAR(20),
  payment_terms VARCHAR(100) DEFAULT 'Net 30',

  -- Pickup Location (Google Places data)
  pickup_address TEXT NOT NULL,
  pickup_city VARCHAR(100),
  pickup_state VARCHAR(50),
  pickup_zip VARCHAR(20),
  pickup_country VARCHAR(100) DEFAULT 'USA',
  pickup_place_id VARCHAR(255),  -- Google Places ID
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),
  pickup_formatted_address TEXT,

  -- Dropoff Location (Google Places data)
  dropoff_address TEXT NOT NULL,
  dropoff_city VARCHAR(100),
  dropoff_state VARCHAR(50),
  dropoff_zip VARCHAR(20),
  dropoff_country VARCHAR(100) DEFAULT 'USA',
  dropoff_place_id VARCHAR(255),  -- Google Places ID
  dropoff_lat DECIMAL(10, 8),
  dropoff_lng DECIMAL(11, 8),
  dropoff_formatted_address TEXT,

  -- Route Information (from Google Routes API)
  distance_miles DECIMAL(10, 2),
  distance_meters INTEGER,
  duration_minutes INTEGER,
  duration_text VARCHAR(100),
  route_polyline TEXT,  -- Encoded polyline for map display

  -- Pricing
  rate_per_mile DECIMAL(10, 2) NOT NULL,
  base_rate DECIMAL(10, 2) DEFAULT 0,
  fuel_surcharge_percent DECIMAL(5, 2) DEFAULT 0,
  fuel_surcharge_amount DECIMAL(10, 2) DEFAULT 0,

  -- Totals
  line_haul_total DECIMAL(10, 2),  -- distance * rate_per_mile
  accessorial_total DECIMAL(10, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2),
  margin_percentage DECIMAL(5, 2) DEFAULT 0,
  margin_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2),

  -- Equipment Info (optional - for later enhancement)
  equipment_type VARCHAR(100),
  equipment_description TEXT,
  weight_lbs DECIMAL(10, 2),

  -- Quote Status
  status VARCHAR(20) DEFAULT 'draft',  -- draft, sent, accepted, rejected, expired
  valid_until DATE,

  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,
  special_instructions TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for inland_quotes
CREATE INDEX IF NOT EXISTS idx_inland_quotes_quote_number ON inland_quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_client_name ON inland_quotes(client_name);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_status ON inland_quotes(status);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_created_at ON inland_quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_pickup_place_id ON inland_quotes(pickup_place_id);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_dropoff_place_id ON inland_quotes(dropoff_place_id);

-- ============================================================
-- 2. INLAND ACCESSORIAL CHARGES - Additional fees for quotes
-- ============================================================
CREATE TABLE IF NOT EXISTS inland_accessorial_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES inland_quotes(id) ON DELETE CASCADE,

  charge_type VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  is_percentage BOOLEAN DEFAULT FALSE,  -- If true, amount is a percentage of line haul

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inland_accessorial_quote_id ON inland_accessorial_charges(quote_id);

-- ============================================================
-- 3. INLAND ACCESSORIAL TYPES - Predefined accessorial charge types
-- ============================================================
CREATE TABLE IF NOT EXISTS inland_accessorial_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  default_amount DECIMAL(10, 2),
  is_percentage BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common accessorial charge types
INSERT INTO inland_accessorial_types (name, description, default_amount, is_percentage, sort_order) VALUES
  ('Detention', 'Waiting time at pickup/delivery', 75.00, FALSE, 1),
  ('Layover', 'Overnight stop required', 350.00, FALSE, 2),
  ('TONU (Truck Order Not Used)', 'Cancellation fee', 250.00, FALSE, 3),
  ('Lumper Fee', 'Loading/unloading assistance', 0, FALSE, 4),
  ('Hazmat', 'Hazardous materials surcharge', 0, TRUE, 5),
  ('Overweight Permit', 'Overweight load permit', 0, FALSE, 6),
  ('Oversize Permit', 'Oversized load permit', 0, FALSE, 7),
  ('Escort Service', 'Required escort vehicles', 0, FALSE, 8),
  ('After Hours Delivery', 'Delivery outside normal hours', 150.00, FALSE, 9),
  ('Residential Delivery', 'Delivery to residential address', 100.00, FALSE, 10),
  ('Liftgate Service', 'Liftgate required', 75.00, FALSE, 11),
  ('Inside Delivery', 'Delivery inside building', 100.00, FALSE, 12),
  ('Pallet Jack Service', 'Pallet jack required', 50.00, FALSE, 13),
  ('Appointment Delivery', 'Scheduled delivery window', 50.00, FALSE, 14),
  ('Toll Charges', 'Highway/bridge tolls', 0, FALSE, 15)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 4. INLAND SAVED LANES - Frequently used routes
-- ============================================================
CREATE TABLE IF NOT EXISTS inland_saved_lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,

  -- Origin
  origin_address TEXT NOT NULL,
  origin_city VARCHAR(100),
  origin_state VARCHAR(50),
  origin_zip VARCHAR(20),
  origin_place_id VARCHAR(255),
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),

  -- Destination
  destination_address TEXT NOT NULL,
  destination_city VARCHAR(100),
  destination_state VARCHAR(50),
  destination_zip VARCHAR(20),
  destination_place_id VARCHAR(255),
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),

  -- Cached route info
  distance_miles DECIMAL(10, 2),
  typical_rate_per_mile DECIMAL(10, 2),

  -- Metadata
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_favorite BOOLEAN DEFAULT FALSE,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inland_saved_lanes_name ON inland_saved_lanes(name);
CREATE INDEX IF NOT EXISTS idx_inland_saved_lanes_favorite ON inland_saved_lanes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_inland_saved_lanes_use_count ON inland_saved_lanes(use_count DESC);

-- ============================================================
-- 5. INLAND EQUIPMENT TYPES - Equipment categories for transport
-- ============================================================
CREATE TABLE IF NOT EXISTS inland_equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  trailer_type VARCHAR(100),  -- flatbed, stepdeck, lowboy, van, reefer, etc.
  max_weight_lbs INTEGER,
  max_length_ft DECIMAL(6, 2),
  max_width_ft DECIMAL(6, 2),
  max_height_ft DECIMAL(6, 2),
  rate_multiplier DECIMAL(5, 2) DEFAULT 1.00,  -- Multiplier for base rate
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common equipment/trailer types
INSERT INTO inland_equipment_types (name, description, trailer_type, max_weight_lbs, max_length_ft, max_width_ft, max_height_ft, rate_multiplier, sort_order) VALUES
  ('Flatbed', 'Standard flatbed trailer', 'flatbed', 48000, 53, 8.5, 8.5, 1.00, 1),
  ('Step Deck', 'Step deck/drop deck trailer', 'stepdeck', 48000, 53, 8.5, 10, 1.10, 2),
  ('Lowboy', 'Lowboy/RGN trailer for heavy equipment', 'lowboy', 80000, 53, 8.5, 12, 1.25, 3),
  ('Dry Van', 'Enclosed dry van trailer', 'van', 45000, 53, 8.5, 9, 0.90, 4),
  ('Reefer', 'Refrigerated trailer', 'reefer', 44000, 53, 8.5, 9, 1.15, 5),
  ('Hotshot', 'Hotshot expedited delivery', 'hotshot', 16000, 40, 8.5, 8.5, 1.30, 6),
  ('Power Only', 'Tractor only, customer trailer', 'power_only', 0, 0, 0, 0, 0.75, 7),
  ('Conestoga', 'Curtain-side trailer', 'conestoga', 44000, 53, 8.5, 8.5, 1.05, 8),
  ('Stretch Flatbed', 'Extended flatbed for long loads', 'stretch', 45000, 75, 8.5, 8.5, 1.20, 9),
  ('Double Drop', 'Double drop/lowboy extended', 'double_drop', 40000, 53, 8.5, 11.5, 1.35, 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 6. INLAND QUOTE STOPS - Multi-stop support
-- ============================================================
CREATE TABLE IF NOT EXISTS inland_quote_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES inland_quotes(id) ON DELETE CASCADE,

  stop_number INTEGER NOT NULL,  -- 1, 2, 3... (0 = pickup, max = final dropoff)
  stop_type VARCHAR(20) DEFAULT 'stop',  -- pickup, stop, dropoff

  -- Location
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  place_id VARCHAR(255),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  formatted_address TEXT,

  -- Stop details
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  special_instructions TEXT,
  appointment_required BOOLEAN DEFAULT FALSE,
  appointment_time TIMESTAMP WITH TIME ZONE,

  -- Additional charges for this stop
  stop_charge DECIMAL(10, 2) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inland_quote_stops_quote_id ON inland_quote_stops(quote_id);
CREATE INDEX IF NOT EXISTS idx_inland_quote_stops_order ON inland_quote_stops(quote_id, stop_number);

-- ============================================================
-- 7. INLAND RATE SETTINGS - Default rates and settings
-- ============================================================
CREATE TABLE IF NOT EXISTS inland_rate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Default rates
  default_rate_per_mile DECIMAL(10, 2) DEFAULT 3.50,
  minimum_charge DECIMAL(10, 2) DEFAULT 350.00,

  -- Fuel surcharge
  fuel_surcharge_enabled BOOLEAN DEFAULT TRUE,
  fuel_surcharge_percent DECIMAL(5, 2) DEFAULT 15.00,

  -- Default margin
  default_margin_percent DECIMAL(5, 2) DEFAULT 15.00,

  -- Quote validity
  default_validity_days INTEGER DEFAULT 7,

  -- Distance-based rate tiers (JSON)
  rate_tiers JSONB DEFAULT '[]',

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO inland_rate_settings (
  default_rate_per_mile,
  minimum_charge,
  fuel_surcharge_enabled,
  fuel_surcharge_percent,
  default_margin_percent,
  default_validity_days
) VALUES (3.50, 350.00, TRUE, 15.00, 15.00, 7)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_accessorial_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_accessorial_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_saved_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_quote_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_rate_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CREATE RLS POLICIES (Public access for now)
-- ============================================================

-- customers policies
DROP POLICY IF EXISTS "Allow public read access on customers" ON customers;
CREATE POLICY "Allow public read access on customers" ON customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on customers" ON customers;
CREATE POLICY "Allow public insert on customers" ON customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on customers" ON customers;
CREATE POLICY "Allow public update on customers" ON customers FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on customers" ON customers;
CREATE POLICY "Allow public delete on customers" ON customers FOR DELETE USING (true);

-- inland_quotes policies
DROP POLICY IF EXISTS "Allow public read access on inland_quotes" ON inland_quotes;
CREATE POLICY "Allow public read access on inland_quotes" ON inland_quotes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on inland_quotes" ON inland_quotes;
CREATE POLICY "Allow public insert on inland_quotes" ON inland_quotes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inland_quotes" ON inland_quotes;
CREATE POLICY "Allow public update on inland_quotes" ON inland_quotes FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on inland_quotes" ON inland_quotes;
CREATE POLICY "Allow public delete on inland_quotes" ON inland_quotes FOR DELETE USING (true);

-- inland_accessorial_charges policies
DROP POLICY IF EXISTS "Allow public read access on inland_accessorial_charges" ON inland_accessorial_charges;
CREATE POLICY "Allow public read access on inland_accessorial_charges" ON inland_accessorial_charges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on inland_accessorial_charges" ON inland_accessorial_charges;
CREATE POLICY "Allow public insert on inland_accessorial_charges" ON inland_accessorial_charges FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inland_accessorial_charges" ON inland_accessorial_charges;
CREATE POLICY "Allow public update on inland_accessorial_charges" ON inland_accessorial_charges FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on inland_accessorial_charges" ON inland_accessorial_charges;
CREATE POLICY "Allow public delete on inland_accessorial_charges" ON inland_accessorial_charges FOR DELETE USING (true);

-- inland_accessorial_types policies
DROP POLICY IF EXISTS "Allow public read access on inland_accessorial_types" ON inland_accessorial_types;
CREATE POLICY "Allow public read access on inland_accessorial_types" ON inland_accessorial_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on inland_accessorial_types" ON inland_accessorial_types;
CREATE POLICY "Allow public insert on inland_accessorial_types" ON inland_accessorial_types FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inland_accessorial_types" ON inland_accessorial_types;
CREATE POLICY "Allow public update on inland_accessorial_types" ON inland_accessorial_types FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on inland_accessorial_types" ON inland_accessorial_types;
CREATE POLICY "Allow public delete on inland_accessorial_types" ON inland_accessorial_types FOR DELETE USING (true);

-- inland_saved_lanes policies
DROP POLICY IF EXISTS "Allow public read access on inland_saved_lanes" ON inland_saved_lanes;
CREATE POLICY "Allow public read access on inland_saved_lanes" ON inland_saved_lanes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on inland_saved_lanes" ON inland_saved_lanes;
CREATE POLICY "Allow public insert on inland_saved_lanes" ON inland_saved_lanes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inland_saved_lanes" ON inland_saved_lanes;
CREATE POLICY "Allow public update on inland_saved_lanes" ON inland_saved_lanes FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on inland_saved_lanes" ON inland_saved_lanes;
CREATE POLICY "Allow public delete on inland_saved_lanes" ON inland_saved_lanes FOR DELETE USING (true);

-- inland_equipment_types policies
DROP POLICY IF EXISTS "Allow public read access on inland_equipment_types" ON inland_equipment_types;
CREATE POLICY "Allow public read access on inland_equipment_types" ON inland_equipment_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on inland_equipment_types" ON inland_equipment_types;
CREATE POLICY "Allow public insert on inland_equipment_types" ON inland_equipment_types FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inland_equipment_types" ON inland_equipment_types;
CREATE POLICY "Allow public update on inland_equipment_types" ON inland_equipment_types FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on inland_equipment_types" ON inland_equipment_types;
CREATE POLICY "Allow public delete on inland_equipment_types" ON inland_equipment_types FOR DELETE USING (true);

-- inland_quote_stops policies
DROP POLICY IF EXISTS "Allow public read access on inland_quote_stops" ON inland_quote_stops;
CREATE POLICY "Allow public read access on inland_quote_stops" ON inland_quote_stops FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on inland_quote_stops" ON inland_quote_stops;
CREATE POLICY "Allow public insert on inland_quote_stops" ON inland_quote_stops FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inland_quote_stops" ON inland_quote_stops;
CREATE POLICY "Allow public update on inland_quote_stops" ON inland_quote_stops FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on inland_quote_stops" ON inland_quote_stops;
CREATE POLICY "Allow public delete on inland_quote_stops" ON inland_quote_stops FOR DELETE USING (true);

-- inland_rate_settings policies
DROP POLICY IF EXISTS "Allow public read access on inland_rate_settings" ON inland_rate_settings;
CREATE POLICY "Allow public read access on inland_rate_settings" ON inland_rate_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on inland_rate_settings" ON inland_rate_settings;
CREATE POLICY "Allow public insert on inland_rate_settings" ON inland_rate_settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inland_rate_settings" ON inland_rate_settings;
CREATE POLICY "Allow public update on inland_rate_settings" ON inland_rate_settings FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================================
-- CREATE TRIGGERS FOR updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_inland_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_inland_quotes_timestamp ON inland_quotes;
CREATE TRIGGER update_inland_quotes_timestamp
  BEFORE UPDATE ON inland_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_inland_timestamp();

DROP TRIGGER IF EXISTS update_inland_saved_lanes_timestamp ON inland_saved_lanes;
CREATE TRIGGER update_inland_saved_lanes_timestamp
  BEFORE UPDATE ON inland_saved_lanes
  FOR EACH ROW
  EXECUTE FUNCTION update_inland_timestamp();

DROP TRIGGER IF EXISTS update_inland_equipment_types_timestamp ON inland_equipment_types;
CREATE TRIGGER update_inland_equipment_types_timestamp
  BEFORE UPDATE ON inland_equipment_types
  FOR EACH ROW
  EXECUTE FUNCTION update_inland_timestamp();

DROP TRIGGER IF EXISTS update_inland_accessorial_types_timestamp ON inland_accessorial_types;
CREATE TRIGGER update_inland_accessorial_types_timestamp
  BEFORE UPDATE ON inland_accessorial_types
  FOR EACH ROW
  EXECUTE FUNCTION update_inland_timestamp();

DROP TRIGGER IF EXISTS update_inland_rate_settings_timestamp ON inland_rate_settings;
CREATE TRIGGER update_inland_rate_settings_timestamp
  BEFORE UPDATE ON inland_rate_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_inland_timestamp();

DROP TRIGGER IF EXISTS update_customers_timestamp ON customers;
CREATE TRIGGER update_customers_timestamp
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_inland_timestamp();

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'Inland Transportation tables created successfully!' as status;

-- Show all created tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE 'inland_%' OR table_name = 'customers')
ORDER BY table_name;
