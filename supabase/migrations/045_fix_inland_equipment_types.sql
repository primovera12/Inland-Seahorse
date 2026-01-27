-- Migration: Fix inland_equipment_types table
-- Purpose: Add base_rate_cents column and make legal_* columns nullable with defaults
-- so equipment types can be created without requiring legal dimension fields

-- Add base_rate_cents column (used by the application but missing from table)
ALTER TABLE inland_equipment_types
  ADD COLUMN IF NOT EXISTS base_rate_cents INTEGER NOT NULL DEFAULT 0;

-- Make legal_* columns nullable with defaults so they aren't required on insert
ALTER TABLE inland_equipment_types
  ALTER COLUMN legal_length_inches SET DEFAULT 0,
  ALTER COLUMN legal_length_inches DROP NOT NULL;

ALTER TABLE inland_equipment_types
  ALTER COLUMN legal_width_inches SET DEFAULT 0,
  ALTER COLUMN legal_width_inches DROP NOT NULL;

ALTER TABLE inland_equipment_types
  ALTER COLUMN legal_height_inches SET DEFAULT 0,
  ALTER COLUMN legal_height_inches DROP NOT NULL;

ALTER TABLE inland_equipment_types
  ALTER COLUMN legal_weight_lbs SET DEFAULT 0,
  ALTER COLUMN legal_weight_lbs DROP NOT NULL;
