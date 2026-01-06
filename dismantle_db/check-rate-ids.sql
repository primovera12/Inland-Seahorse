-- Diagnostic query to see what's wrong with the rates

-- 1. Check if Caterpillar rates exist and what their make_id is
SELECT 'Rates with Caterpillar in rate_lookup view:' as info;
SELECT
  r.id,
  r.equipment_type_id,
  r.make_id,
  r.model_id,
  r.price,
  rl.make as make_name,
  rl.model as model_name
FROM rates r
LEFT JOIN rate_lookup rl ON r.id = rl.id
WHERE rl.make = 'Caterpillar'
LIMIT 5;

-- 2. Check what the actual Caterpillar make_id is
SELECT 'Caterpillar make record:' as info;
SELECT * FROM makes WHERE name = 'Caterpillar';

-- 3. Check if any rates have NULL make_id or model_id
SELECT 'Rates with NULL foreign keys:' as info;
SELECT COUNT(*) as total_rates,
       COUNT(make_id) as rates_with_make_id,
       COUNT(model_id) as rates_with_model_id,
       COUNT(*) - COUNT(make_id) as missing_make_id,
       COUNT(*) - COUNT(model_id) as missing_model_id
FROM rates;

-- 4. Sample of actual make_id values in rates
SELECT 'Sample of make_id values in rates:' as info;
SELECT DISTINCT make_id, COUNT(*) as count
FROM rates
GROUP BY make_id
LIMIT 10;

-- 5. Check if make_id in rates matches any actual makes
SELECT 'Rates that match actual makes:' as info;
SELECT COUNT(*) as rates_matching_makes
FROM rates r
INNER JOIN makes m ON r.make_id = m.id;

SELECT COUNT(*) as total_rates FROM rates;
