-- ============================================================
-- POPULATE RATES FOR ALL EXISTING COMBINATIONS
-- ============================================================
-- Since you already have all models for all makes,
-- this creates rates for every equipment_type + make + model combination
-- ============================================================

-- Create rates for ALL combinations
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT
  et.id as equipment_type_id,
  m.id as make_id,
  mo.id as model_id,
  NULL as price
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE mo.make_id = m.id  -- Only match models to their correct make
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- Verification
SELECT '=== RESULTS ===' as info;

SELECT 'Total rates in database:' as info;
SELECT COUNT(*) as total_rates FROM rates;

SELECT 'Rates with NULL prices (need pricing):' as info;
SELECT COUNT(*) as needs_price FROM rates WHERE price IS NULL;

SELECT 'Rates with prices (already filled):' as info;
SELECT COUNT(*) as has_price FROM rates WHERE price IS NOT NULL;

SELECT 'Breakdown by make (top 15):' as info;
SELECT
  m.name as make,
  COUNT(*) as rate_count,
  COUNT(*) FILTER (WHERE r.price IS NULL) as needs_price,
  COUNT(*) FILTER (WHERE r.price IS NOT NULL) as has_price
FROM rates r
JOIN makes m ON r.make_id = m.id
GROUP BY m.name
ORDER BY rate_count DESC
LIMIT 15;

SELECT 'Breakdown by equipment type:' as info;
SELECT
  et.name as equipment_type,
  COUNT(*) as rate_count,
  COUNT(*) FILTER (WHERE r.price IS NULL) as needs_price,
  COUNT(*) FILTER (WHERE r.price IS NOT NULL) as has_price
FROM rates r
JOIN equipment_types et ON r.equipment_type_id = et.id
GROUP BY et.name
ORDER BY rate_count DESC;
