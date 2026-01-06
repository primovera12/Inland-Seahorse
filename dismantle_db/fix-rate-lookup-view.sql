-- ============================================================
-- FIX RATE_LOOKUP VIEW
-- ============================================================
-- The view was missing make_id and model_id columns
-- This fixes the filtering issue
-- ============================================================

-- Drop the old view
DROP VIEW IF EXISTS rate_lookup;

-- Create the corrected view with make_id and model_id
CREATE VIEW rate_lookup AS
SELECT
  r.id,
  r.equipment_type_id,
  r.make_id,
  r.model_id,
  r.price,
  r.notes,
  r.updated_at,
  et.name AS equipment_type,
  m.name AS make,
  mo.name AS model
FROM rates r
LEFT JOIN equipment_types et ON r.equipment_type_id = et.id
LEFT JOIN makes m ON r.make_id = m.id
LEFT JOIN models mo ON r.model_id = mo.id;

-- Verify the fix
SELECT 'Verification - rate_lookup columns:' as step;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rate_lookup'
ORDER BY ordinal_position;

SELECT 'Verification - Sample data from rate_lookup:' as step;
SELECT
  id,
  make_id,
  model_id,
  make,
  model,
  equipment_type,
  price
FROM rate_lookup
LIMIT 5;

SELECT 'Verification - Caterpillar rates with make_id:' as step;
SELECT
  id,
  make_id,
  make,
  model,
  equipment_type
FROM rate_lookup
WHERE make = 'Caterpillar'
LIMIT 5;
