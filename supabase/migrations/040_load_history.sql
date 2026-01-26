-- Migration: Load History
-- Purpose: Track completed loads for margin tracking and business intelligence
-- Date: 2026-01-26

-- ============================================================================
-- Table: load_history
-- ============================================================================

CREATE TABLE load_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quote Links
  load_planner_quote_id UUID REFERENCES load_planner_quotes(id) ON DELETE SET NULL,
  inland_quote_id UUID REFERENCES inland_quotes(id) ON DELETE SET NULL,
  quote_number VARCHAR(100),

  -- Customer (denormalized for history)
  customer_name VARCHAR(255),
  customer_company VARCHAR(255),

  -- Carrier Assignment
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES carrier_drivers(id) ON DELETE SET NULL,
  truck_id UUID REFERENCES carrier_trucks(id) ON DELETE SET NULL,

  -- Route
  origin_city VARCHAR(100) NOT NULL,
  origin_state VARCHAR(50) NOT NULL,
  origin_zip VARCHAR(20),
  destination_city VARCHAR(100) NOT NULL,
  destination_state VARCHAR(50) NOT NULL,
  destination_zip VARCHAR(20),
  total_miles INTEGER,

  -- Cargo
  cargo_description TEXT,
  cargo_pieces INTEGER,
  cargo_length_in INTEGER,
  cargo_width_in INTEGER,
  cargo_height_in INTEGER,
  cargo_weight_lbs INTEGER,
  is_oversize BOOLEAN NOT NULL DEFAULT false,
  is_overweight BOOLEAN NOT NULL DEFAULT false,
  equipment_type_used VARCHAR(50),

  -- Financials (all in cents)
  customer_rate_cents INTEGER,
  carrier_rate_cents INTEGER,
  margin_cents INTEGER,
  margin_percentage DECIMAL(5,2),
  rate_per_mile_customer_cents INTEGER,
  rate_per_mile_carrier_cents INTEGER,

  -- Dates
  quote_date DATE,
  booked_date DATE,
  pickup_date DATE,
  delivery_date DATE,
  invoice_date DATE,
  paid_date DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('booked', 'in_transit', 'delivered', 'completed', 'cancelled')),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- Indexes for common queries
-- ============================================================================

CREATE INDEX idx_lh_dates ON load_history(pickup_date DESC, delivery_date DESC);
CREATE INDEX idx_lh_lane ON load_history(origin_state, destination_state);
CREATE INDEX idx_lh_carrier ON load_history(carrier_id) WHERE carrier_id IS NOT NULL;
CREATE INDEX idx_lh_equipment ON load_history(equipment_type_used) WHERE equipment_type_used IS NOT NULL;
CREATE INDEX idx_lh_margin ON load_history(margin_percentage) WHERE margin_percentage IS NOT NULL;
CREATE INDEX idx_lh_dimensions ON load_history(cargo_length_in, cargo_width_in, cargo_height_in);
CREATE INDEX idx_lh_customer ON load_history(customer_name);
CREATE INDEX idx_lh_status ON load_history(status);
CREATE INDEX idx_lh_quote_links ON load_history(load_planner_quote_id, inland_quote_id);

-- Full text search for cargo description
CREATE INDEX idx_lh_cargo_fts ON load_history USING gin(to_tsvector('english', COALESCE(cargo_description, '')));

-- ============================================================================
-- Trigger: Calculate margin fields automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_load_margins()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate margin in cents
  IF NEW.customer_rate_cents IS NOT NULL AND NEW.carrier_rate_cents IS NOT NULL THEN
    NEW.margin_cents := NEW.customer_rate_cents - NEW.carrier_rate_cents;

    -- Calculate margin percentage
    IF NEW.customer_rate_cents > 0 THEN
      NEW.margin_percentage := ROUND((NEW.margin_cents::DECIMAL / NEW.customer_rate_cents) * 100, 2);
    END IF;
  END IF;

  -- Calculate rate per mile
  IF NEW.total_miles IS NOT NULL AND NEW.total_miles > 0 THEN
    IF NEW.customer_rate_cents IS NOT NULL THEN
      NEW.rate_per_mile_customer_cents := NEW.customer_rate_cents / NEW.total_miles;
    END IF;
    IF NEW.carrier_rate_cents IS NOT NULL THEN
      NEW.rate_per_mile_carrier_cents := NEW.carrier_rate_cents / NEW.total_miles;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER load_history_calculate_margins
  BEFORE INSERT OR UPDATE ON load_history
  FOR EACH ROW
  EXECUTE FUNCTION calculate_load_margins();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE load_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view load history" ON load_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert load history" ON load_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update load history" ON load_history
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete load history" ON load_history
  FOR DELETE USING (auth.uid() IS NOT NULL);
