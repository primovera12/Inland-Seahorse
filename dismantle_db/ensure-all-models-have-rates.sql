-- ============================================================
-- ENSURE ALL MODELS HAVE RATES
-- ============================================================
-- Creates a rate for every single model in the database
-- ============================================================

-- Insert rates for ALL models
INSERT INTO rates (make_id, model_id, price)
SELECT
  mo.make_id,
  mo.id,
  NULL::DECIMAL(10,2)
FROM models mo
ON CONFLICT (make_id, model_id) DO NOTHING;

-- Verification
SELECT '=== VERIFICATION ===' as info;

SELECT 'Total models vs total rates:' as info;
SELECT
  (SELECT COUNT(*) FROM models) as total_models,
  (SELECT COUNT(*) FROM rates) as total_rates,
  CASE
    WHEN (SELECT COUNT(*) FROM models) = (SELECT COUNT(*) FROM rates)
    THEN '✓ All models have rates'
    ELSE '✗ Some models are missing rates'
  END as status;

SELECT 'Makes with no rates (should be empty):' as info;
SELECT
  m.name as make,
  COUNT(mo.id) as total_models,
  COUNT(r.id) as total_rates
FROM makes m
LEFT JOIN models mo ON mo.make_id = m.id
LEFT JOIN rates r ON r.make_id = m.id AND r.model_id = mo.id
GROUP BY m.id, m.name
HAVING COUNT(r.id) = 0
ORDER BY m.name;

SELECT 'Rates by make (all makes):' as info;
SELECT
  m.name as make,
  COUNT(r.id) as rate_count
FROM makes m
LEFT JOIN rates r ON r.make_id = m.id
GROUP BY m.id, m.name
ORDER BY rate_count DESC, m.name;
