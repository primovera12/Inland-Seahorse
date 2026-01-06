-- Debug query to check if rates have proper make_id and model_id values

-- 1. Check how many rates have NULL make_id or model_id
SELECT
  COUNT(*) as total_rates,
  COUNT(make_id) as rates_with_make,
  COUNT(model_id) as rates_with_model,
  COUNT(*) - COUNT(make_id) as rates_missing_make,
  COUNT(*) - COUNT(model_id) as rates_missing_model
FROM rates;

-- 2. Check if we have makes in the database
SELECT COUNT(*) as total_makes FROM makes;

-- 3. Check if we have models in the database
SELECT COUNT(*) as total_models FROM models;

-- 4. Sample of rates with their IDs
SELECT
  r.id,
  r.equipment_type_id,
  r.make_id,
  r.model_id,
  r.price,
  et.name as equipment_type,
  m.name as make_name,
  mo.name as model_name
FROM rates r
LEFT JOIN equipment_types et ON r.equipment_type_id = et.id
LEFT JOIN makes m ON r.make_id = m.id
LEFT JOIN models mo ON r.model_id = mo.id
LIMIT 10;

-- 5. Check rate_lookup view
SELECT * FROM rate_lookup LIMIT 10;

-- 6. Find Caterpillar make ID
SELECT id, name FROM makes WHERE name = 'Caterpillar';
