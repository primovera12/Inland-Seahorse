-- Migration: Add Carrier Assignment to Load Planner Quotes
-- Purpose: Allow assigning carriers, drivers, and trucks to quotes
-- Date: 2026-01-26

-- ============================================================================
-- Add carrier assignment fields to load_planner_quotes
-- ============================================================================

ALTER TABLE load_planner_quotes
ADD COLUMN carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
ADD COLUMN driver_id UUID REFERENCES carrier_drivers(id) ON DELETE SET NULL,
ADD COLUMN truck_id UUID REFERENCES carrier_trucks(id) ON DELETE SET NULL,
ADD COLUMN carrier_rate_cents INTEGER,
ADD COLUMN carrier_notes TEXT;

-- Index for carrier lookups
CREATE INDEX idx_lpq_carrier ON load_planner_quotes(carrier_id) WHERE carrier_id IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN load_planner_quotes.carrier_id IS 'Assigned carrier for this load';
COMMENT ON COLUMN load_planner_quotes.driver_id IS 'Assigned driver (optional)';
COMMENT ON COLUMN load_planner_quotes.truck_id IS 'Assigned truck (optional)';
COMMENT ON COLUMN load_planner_quotes.carrier_rate_cents IS 'Rate being paid to carrier (in cents)';
COMMENT ON COLUMN load_planner_quotes.carrier_notes IS 'Internal notes about carrier assignment';
