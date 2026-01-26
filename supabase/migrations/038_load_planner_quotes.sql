-- Migration: Load Planner Quotes System
-- Purpose: Tables for saving, viewing, and editing Load Planner v2 quotes
-- Date: 2026-01-26

-- ============================================================================
-- Table 1: load_planner_quotes (Main quote record)
-- ============================================================================

CREATE TABLE load_planner_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),

  -- Customer
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_company VARCHAR(255),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Customer Address
  customer_address_line1 VARCHAR(255),
  customer_address_city VARCHAR(100),
  customer_address_state VARCHAR(50),
  customer_address_zip VARCHAR(20),

  -- Pickup Location
  pickup_address VARCHAR(255),
  pickup_city VARCHAR(100),
  pickup_state VARCHAR(50),
  pickup_zip VARCHAR(20),
  pickup_lat DECIMAL(10,7),
  pickup_lng DECIMAL(10,7),

  -- Dropoff Location
  dropoff_address VARCHAR(255),
  dropoff_city VARCHAR(100),
  dropoff_state VARCHAR(50),
  dropoff_zip VARCHAR(20),
  dropoff_lat DECIMAL(10,7),
  dropoff_lng DECIMAL(10,7),

  -- Route Metrics
  distance_miles INTEGER,
  duration_minutes INTEGER,
  route_polyline TEXT,

  -- Totals (in cents)
  subtotal_cents INTEGER,
  total_cents INTEGER,

  -- Public Sharing
  public_token UUID DEFAULT gen_random_uuid() NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- User & Notes
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  internal_notes TEXT,
  quote_notes TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Indexes for load_planner_quotes
CREATE INDEX idx_lpq_quote_number ON load_planner_quotes(quote_number);
CREATE INDEX idx_lpq_status ON load_planner_quotes(status) WHERE is_active = true;
CREATE INDEX idx_lpq_customer ON load_planner_quotes(customer_name) WHERE is_active = true;
CREATE INDEX idx_lpq_customer_company ON load_planner_quotes(customer_company) WHERE is_active = true;
CREATE INDEX idx_lpq_created ON load_planner_quotes(created_at DESC) WHERE is_active = true;
CREATE INDEX idx_lpq_route ON load_planner_quotes(pickup_state, dropoff_state) WHERE is_active = true;
CREATE INDEX idx_lpq_public_token ON load_planner_quotes(public_token);
CREATE INDEX idx_lpq_company ON load_planner_quotes(company_id) WHERE company_id IS NOT NULL;

-- ============================================================================
-- Table 2: load_planner_cargo_items (Individual cargo items)
-- ============================================================================

CREATE TABLE load_planner_cargo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- Identification
  sku VARCHAR(100),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Dimensions (stored in inches for precision)
  length_in INTEGER,
  width_in INTEGER,
  height_in INTEGER,
  weight_lbs INTEGER,

  -- Properties
  stackable BOOLEAN NOT NULL DEFAULT false,
  bottom_only BOOLEAN NOT NULL DEFAULT false,
  max_layers INTEGER,
  fragile BOOLEAN NOT NULL DEFAULT false,
  hazmat BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,

  -- Orientation & Geometry
  orientation INTEGER NOT NULL DEFAULT 1, -- 1=fixed, 3=rotatable, 63=tiltable
  geometry VARCHAR(50) NOT NULL DEFAULT 'box', -- box, cylinder, hollow-cylinder

  -- Equipment Database Link
  equipment_make_id UUID,
  equipment_model_id UUID,
  dimensions_source VARCHAR(20), -- ai, database, manual

  -- Images
  image_url TEXT,
  image_url_2 TEXT,
  front_image_url TEXT,
  side_image_url TEXT,

  -- Load Assignment (from load planning algorithm)
  assigned_truck_index INTEGER,
  placement_x DECIMAL(8,2),
  placement_y DECIMAL(8,2),
  placement_z DECIMAL(8,2),
  placement_rotation INTEGER,

  -- Metadata
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for load_planner_cargo_items
CREATE INDEX idx_lpci_quote ON load_planner_cargo_items(quote_id);
CREATE INDEX idx_lpci_dimensions ON load_planner_cargo_items(length_in, width_in, height_in);
CREATE INDEX idx_lpci_weight ON load_planner_cargo_items(weight_lbs);

-- ============================================================================
-- Table 3: load_planner_trucks (Assigned trucks with specs)
-- ============================================================================

CREATE TABLE load_planner_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- Truck Info (from trucks.ts database)
  truck_index INTEGER NOT NULL, -- Order in quote (0, 1, 2...)
  truck_type_id VARCHAR(100) NOT NULL, -- e.g., 'flatbed-48', 'rgn-3axle'
  truck_name VARCHAR(255),
  truck_category VARCHAR(50), -- FLATBED, STEP_DECK, RGN, etc.

  -- Specs (copied for historical record)
  deck_length_ft DECIMAL(8,2),
  deck_width_ft DECIMAL(8,2),
  deck_height_ft DECIMAL(8,2),
  well_length_ft DECIMAL(8,2),
  max_cargo_weight_lbs INTEGER,

  -- Load Stats
  total_weight_lbs INTEGER,
  total_items INTEGER,
  is_legal BOOLEAN NOT NULL DEFAULT true,

  -- Permits & Warnings
  permits_required TEXT[], -- Array of permit types needed
  warnings TEXT[], -- Load warnings/alerts
  truck_score INTEGER, -- Fit score (0-100)

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(quote_id, truck_index)
);

-- Indexes for load_planner_trucks
CREATE INDEX idx_lpt_quote ON load_planner_trucks(quote_id);
CREATE INDEX idx_lpt_type ON load_planner_trucks(truck_type_id);

-- ============================================================================
-- Table 4: load_planner_service_items (Line Haul, Fuel, etc.)
-- ============================================================================

CREATE TABLE load_planner_service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- Service Info
  service_type_id UUID, -- FK to inland_service_types if linked
  name VARCHAR(255) NOT NULL,

  -- Pricing (in cents)
  rate_cents INTEGER NOT NULL,
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
  total_cents INTEGER NOT NULL,

  -- Per-Truck Pricing (null = applies to all trucks)
  truck_index INTEGER,

  -- Metadata
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for load_planner_service_items
CREATE INDEX idx_lpsi_quote ON load_planner_service_items(quote_id);

-- ============================================================================
-- Table 5: load_planner_accessorials (Detention, Layover, etc.)
-- ============================================================================

CREATE TABLE load_planner_accessorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- Accessorial Info
  accessorial_type_id UUID, -- FK to inland_accessorial_types if linked
  name VARCHAR(255) NOT NULL,

  -- Billing
  billing_unit VARCHAR(20) NOT NULL
    CHECK (billing_unit IN ('flat', 'hour', 'day', 'way', 'week', 'month', 'stop', 'mile')),
  rate_cents INTEGER NOT NULL,
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
  total_cents INTEGER NOT NULL,

  -- Notes
  notes TEXT,

  -- Metadata
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for load_planner_accessorials
CREATE INDEX idx_lpa_quote ON load_planner_accessorials(quote_id);

-- ============================================================================
-- Table 6: load_planner_permits (State-by-state permit costs)
-- ============================================================================

CREATE TABLE load_planner_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- State
  state_code VARCHAR(2) NOT NULL,
  state_name VARCHAR(100),

  -- Calculated Values (original from algorithm)
  calculated_permit_fee_cents INTEGER,
  calculated_escort_cost_cents INTEGER,

  -- User Overrides (if manually edited)
  permit_fee_cents INTEGER,
  escort_cost_cents INTEGER,

  -- Route Info for this state
  distance_miles INTEGER,
  escort_count INTEGER,
  pole_car_required BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(quote_id, state_code)
);

-- Indexes for load_planner_permits
CREATE INDEX idx_lpp_quote ON load_planner_permits(quote_id);
CREATE INDEX idx_lpp_state ON load_planner_permits(state_code);

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_load_planner_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER load_planner_quotes_updated_at
  BEFORE UPDATE ON load_planner_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_load_planner_quotes_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE load_planner_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_cargo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_accessorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_permits ENABLE ROW LEVEL SECURITY;

-- Policies for load_planner_quotes
CREATE POLICY "Users can view load planner quotes"
  ON load_planner_quotes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert load planner quotes"
  ON load_planner_quotes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update load planner quotes"
  ON load_planner_quotes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete load planner quotes"
  ON load_planner_quotes FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Policies for load_planner_cargo_items (access through quote)
CREATE POLICY "Users can view cargo items"
  ON load_planner_cargo_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can insert cargo items"
  ON load_planner_cargo_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can update cargo items"
  ON load_planner_cargo_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can delete cargo items"
  ON load_planner_cargo_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

-- Policies for load_planner_trucks
CREATE POLICY "Users can view trucks"
  ON load_planner_trucks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can insert trucks"
  ON load_planner_trucks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can update trucks"
  ON load_planner_trucks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can delete trucks"
  ON load_planner_trucks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

-- Policies for load_planner_service_items
CREATE POLICY "Users can view service items"
  ON load_planner_service_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can insert service items"
  ON load_planner_service_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can update service items"
  ON load_planner_service_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can delete service items"
  ON load_planner_service_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

-- Policies for load_planner_accessorials
CREATE POLICY "Users can view accessorials"
  ON load_planner_accessorials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can insert accessorials"
  ON load_planner_accessorials FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can update accessorials"
  ON load_planner_accessorials FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can delete accessorials"
  ON load_planner_accessorials FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

-- Policies for load_planner_permits
CREATE POLICY "Users can view permits"
  ON load_planner_permits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can insert permits"
  ON load_planner_permits FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can update permits"
  ON load_planner_permits FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

CREATE POLICY "Users can delete permits"
  ON load_planner_permits FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

-- ============================================================================
-- Function: Generate Quote Number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_load_planner_quote_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the next counter value for today
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 'LP-[0-9]{8}-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO counter
  FROM load_planner_quotes
  WHERE quote_number LIKE 'LP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';

  -- Format: LP-YYYYMMDD-NNNN
  new_number := 'LP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE load_planner_quotes IS 'Main quote records for Load Planner v2';
COMMENT ON TABLE load_planner_cargo_items IS 'Individual cargo items for each quote';
COMMENT ON TABLE load_planner_trucks IS 'Assigned trucks with specs and load stats';
COMMENT ON TABLE load_planner_service_items IS 'Service line items (Line Haul, Fuel, etc.)';
COMMENT ON TABLE load_planner_accessorials IS 'Accessorial charges (Detention, Layover, etc.)';
COMMENT ON TABLE load_planner_permits IS 'State-by-state permit costs with user overrides';
