-- Final diagnostic to see what's actually in the database

-- 1. Check Caterpillar make and its ID
SELECT '1. Caterpillar make:' as step;
SELECT id, name FROM makes WHERE name = 'Caterpillar';

-- 2. Check all rates and their make_id values (sample)
SELECT '2. Sample of rates from rates table:' as step;
SELECT
  r.id,
  r.make_id,
  r.model_id,
  r.price,
  m.name as make_name_from_join
FROM rates r
LEFT JOIN makes m ON r.make_id = m.id
LIMIT 10;

-- 3. Check what the rate_lookup view shows
SELECT '3. Sample from rate_lookup view:' as step;
SELECT
  id,
  make_id,
  model_id,
  make,
  model,
  equipment_type,
  price
FROM rate_lookup
LIMIT 10;

-- 4. Count rates by make_id
SELECT '4. Rates grouped by make_id:' as step;
SELECT
  r.make_id,
  m.name as make_name,
  COUNT(*) as count
FROM rates r
LEFT JOIN makes m ON r.make_id = m.id
GROUP BY r.make_id, m.name
ORDER BY count DESC;

-- 5. Specifically check for Caterpillar rates
SELECT '5. Caterpillar rates (if any):' as step;
SELECT
  r.id,
  r.make_id,
  r.model_id,
  r.price,
  et.name as equipment_type,
  m.name as make,
  mo.name as model
FROM rates r
JOIN makes m ON r.make_id = m.id
LEFT JOIN equipment_types et ON r.equipment_type_id = et.id
LEFT JOIN models mo ON r.model_id = mo.id
WHERE m.name = 'Caterpillar';

-- 6. Check if the clean script actually deleted rates
SELECT '6. Total rates count:' as step;
SELECT COUNT(*) as total_rates FROM rates;
