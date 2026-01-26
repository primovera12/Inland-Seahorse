-- Migration: Carriers Management System
-- Purpose: Tables for managing trucking companies, owner-operators, drivers, and trucks
-- Date: 2026-01-26

-- ============================================================================
-- Table 1: carriers (Trucking companies or owner-operators)
-- ============================================================================

CREATE TABLE carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_type VARCHAR(20) NOT NULL CHECK (carrier_type IN ('company', 'owner_operator')),

  -- Company Info
  company_name VARCHAR(255),
  mc_number VARCHAR(50),
  dot_number VARCHAR(50),
  ein_tax_id VARCHAR(50),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),

  -- Primary Contact
  primary_contact_name VARCHAR(255),
  primary_contact_phone VARCHAR(50),
  primary_contact_email VARCHAR(255),

  -- Billing
  billing_email VARCHAR(255),
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  preferred_payment_method VARCHAR(50) CHECK (preferred_payment_method IN ('check', 'ach', 'quick_pay', 'factoring')),

  -- Factoring Company
  factoring_company_name VARCHAR(255),
  factoring_company_phone VARCHAR(50),
  factoring_company_email VARCHAR(255),

  -- Insurance
  insurance_company VARCHAR(255),
  insurance_policy_number VARCHAR(100),
  insurance_expiry DATE,
  cargo_insurance_limit_cents INTEGER,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'preferred', 'on_hold', 'blacklisted')),

  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for carriers
CREATE INDEX idx_carriers_type ON carriers(carrier_type) WHERE is_active = true;
CREATE INDEX idx_carriers_status ON carriers(status) WHERE is_active = true;
CREATE INDEX idx_carriers_mc ON carriers(mc_number) WHERE mc_number IS NOT NULL;
CREATE INDEX idx_carriers_dot ON carriers(dot_number) WHERE dot_number IS NOT NULL;
CREATE INDEX idx_carriers_name ON carriers(company_name) WHERE is_active = true;
CREATE INDEX idx_carriers_state ON carriers(state) WHERE is_active = true;
CREATE INDEX idx_carriers_created ON carriers(created_at DESC) WHERE is_active = true;

-- ============================================================================
-- Table 2: carrier_drivers (Individual drivers working for carriers)
-- ============================================================================

CREATE TABLE carrier_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  is_owner BOOLEAN NOT NULL DEFAULT false,

  -- Personal
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(100),

  -- Contact
  phone VARCHAR(50),
  phone_secondary VARCHAR(50),
  email VARCHAR(255),

  -- Address
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),

  -- CDL
  cdl_number VARCHAR(50),
  cdl_state VARCHAR(10),
  cdl_class VARCHAR(10) CHECK (cdl_class IS NULL OR cdl_class IN ('A', 'B', 'C')),
  cdl_expiry DATE,
  cdl_endorsements VARCHAR(100),
  medical_card_expiry DATE,

  -- Emergency Contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(100),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'on_leave')),

  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for carrier_drivers
CREATE INDEX idx_cd_carrier ON carrier_drivers(carrier_id);
CREATE INDEX idx_cd_status ON carrier_drivers(status) WHERE is_active = true;
CREATE INDEX idx_cd_name ON carrier_drivers(last_name, first_name) WHERE is_active = true;
CREATE INDEX idx_cd_cdl_expiry ON carrier_drivers(cdl_expiry) WHERE cdl_expiry IS NOT NULL;
CREATE INDEX idx_cd_medical_expiry ON carrier_drivers(medical_card_expiry) WHERE medical_card_expiry IS NOT NULL;

-- ============================================================================
-- Table 3: carrier_trucks (Trucks/trailers owned by carriers)
-- ============================================================================

CREATE TABLE carrier_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  assigned_driver_id UUID REFERENCES carrier_drivers(id) ON DELETE SET NULL,

  -- Identification
  unit_number VARCHAR(50),
  vin VARCHAR(50),
  license_plate VARCHAR(50),
  license_plate_state VARCHAR(10),

  -- Vehicle
  year INTEGER,
  make VARCHAR(100),
  model VARCHAR(100),

  -- Type (links to trucks.ts definitions)
  truck_type_id VARCHAR(100),
  category VARCHAR(50),
  custom_type_description VARCHAR(255),

  -- Specs
  deck_length_ft DECIMAL(8,2),
  deck_width_ft DECIMAL(8,2),
  deck_height_ft DECIMAL(8,2),
  well_length_ft DECIMAL(8,2),
  max_cargo_weight_lbs INTEGER,
  tare_weight_lbs INTEGER,
  axle_count INTEGER,

  -- Equipment
  has_tarps BOOLEAN NOT NULL DEFAULT false,
  tarp_type VARCHAR(50),
  has_chains BOOLEAN NOT NULL DEFAULT false,
  chain_count INTEGER,
  has_straps BOOLEAN NOT NULL DEFAULT false,
  strap_count INTEGER,
  has_coil_racks BOOLEAN NOT NULL DEFAULT false,
  has_load_bars BOOLEAN NOT NULL DEFAULT false,
  has_ramps BOOLEAN NOT NULL DEFAULT false,
  other_equipment TEXT,

  -- Compliance
  registration_state VARCHAR(10),
  registration_expiry DATE,
  annual_inspection_date DATE,
  annual_inspection_expiry DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'out_of_service', 'sold')),

  -- Metadata
  notes TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for carrier_trucks
CREATE INDEX idx_ct_carrier ON carrier_trucks(carrier_id);
CREATE INDEX idx_ct_driver ON carrier_trucks(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;
CREATE INDEX idx_ct_category ON carrier_trucks(category) WHERE is_active = true;
CREATE INDEX idx_ct_status ON carrier_trucks(status) WHERE is_active = true;
CREATE INDEX idx_ct_type ON carrier_trucks(truck_type_id) WHERE is_active = true;
CREATE INDEX idx_ct_registration_expiry ON carrier_trucks(registration_expiry) WHERE registration_expiry IS NOT NULL;
CREATE INDEX idx_ct_inspection_expiry ON carrier_trucks(annual_inspection_expiry) WHERE annual_inspection_expiry IS NOT NULL;

-- ============================================================================
-- Triggers: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_carriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER carriers_updated_at
  BEFORE UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION update_carriers_updated_at();

CREATE TRIGGER carrier_drivers_updated_at
  BEFORE UPDATE ON carrier_drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_carriers_updated_at();

CREATE TRIGGER carrier_trucks_updated_at
  BEFORE UPDATE ON carrier_trucks
  FOR EACH ROW
  EXECUTE FUNCTION update_carriers_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_trucks ENABLE ROW LEVEL SECURITY;

-- Policies for carriers
CREATE POLICY "Users can view carriers"
  ON carriers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert carriers"
  ON carriers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update carriers"
  ON carriers FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete carriers"
  ON carriers FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Policies for carrier_drivers (access through carrier)
CREATE POLICY "Users can view carrier drivers"
  ON carrier_drivers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can insert carrier drivers"
  ON carrier_drivers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can update carrier drivers"
  ON carrier_drivers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can delete carrier drivers"
  ON carrier_drivers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_id AND auth.uid() IS NOT NULL
  ));

-- Policies for carrier_trucks (access through carrier)
CREATE POLICY "Users can view carrier trucks"
  ON carrier_trucks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can insert carrier trucks"
  ON carrier_trucks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can update carrier trucks"
  ON carrier_trucks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can delete carrier trucks"
  ON carrier_trucks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_id AND auth.uid() IS NOT NULL
  ));

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE carriers IS 'Trucking companies and owner-operators for 3PL broker management';
COMMENT ON TABLE carrier_drivers IS 'Individual drivers working for carriers';
COMMENT ON TABLE carrier_trucks IS 'Trucks and trailers owned/operated by carriers';

COMMENT ON COLUMN carriers.carrier_type IS 'company = trucking company with multiple drivers, owner_operator = individual truck owner';
COMMENT ON COLUMN carriers.status IS 'active = currently working with, inactive = no longer using, preferred = priority carrier, on_hold = temporarily paused, blacklisted = do not use';
COMMENT ON COLUMN carrier_drivers.is_owner IS 'True if this driver IS the owner-operator themselves';
COMMENT ON COLUMN carrier_drivers.cdl_endorsements IS 'H=Hazmat, N=Tank, T=Double/Triple, P=Passenger, S=School Bus';
COMMENT ON COLUMN carrier_trucks.truck_type_id IS 'Links to truck definitions in trucks.ts (e.g., flatbed-48, rgn-3axle)';
COMMENT ON COLUMN carrier_trucks.category IS 'FLATBED, STEP_DECK, RGN, LOWBOY, etc.';
