-- ============================================================
-- CLEAN AND FIX RATES - Simple Solution
-- ============================================================
-- This will delete all rates and recreate them with proper foreign keys
-- ============================================================

-- Step 1: Delete all existing rates
DELETE FROM rates;

-- Step 2: Verify makes and models exist (they should from previous script)
SELECT 'Checking Caterpillar exists...' as step;
SELECT id, name FROM makes WHERE name = 'Caterpillar';

SELECT 'Checking Caterpillar models...' as step;
SELECT mo.id, mo.name
FROM models mo
JOIN makes m ON mo.make_id = m.id
WHERE m.name = 'Caterpillar';

-- Step 3: Create rates with proper foreign keys
-- EXCAVATORS - Caterpillar
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
  AND mo.name IN ('303.5', '305.5', '308', '312', '315', '320', '320D', '320E', '323', '325', '330', '330D', '336', '336D', '340', '345', '349', '365')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- EXCAVATORS - Komatsu
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Komatsu'
  AND mo.make_id = m.id
  AND mo.name IN ('PC35', 'PC50', 'PC78', 'PC88', 'PC138', 'PC200', 'PC210', 'PC220', 'PC228', 'PC240', 'PC290', 'PC300', 'PC360', 'PC400', 'PC490')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- EXCAVATORS - Hitachi
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Hitachi'
  AND mo.make_id = m.id
  AND mo.name IN ('ZX50', 'ZX85', 'ZX120', 'ZX200', 'ZX210', 'ZX225', 'ZX250', 'ZX290', 'ZX350', 'ZX470', 'ZX670')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- EXCAVATORS - John Deere
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
  AND mo.name IN ('35G', '50G', '85G', '135G', '210G', '245G', '350G', '380G', '470G')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - Bobcat
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Skid Steer'
  AND m.name = 'Bobcat'
  AND mo.make_id = m.id
  AND mo.name IN ('E26', 'E35', 'E50', 'E85', 'S450', 'S510', 'S570', 'S630', 'S650', 'S750', 'S850', 'T450', 'T550', 'T650')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - Caterpillar
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Skid Steer'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
  AND mo.name IN ('236D', '246D', '256D', '262D', '272D', '279D', '289D', '299D')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- Step 4: Verify the fix
SELECT 'Verification - Total rates created:' as step;
SELECT COUNT(*) as total_rates FROM rates;

SELECT 'Verification - Caterpillar rates:' as step;
SELECT
  et.name as equipment_type,
  m.name as make,
  mo.name as model,
  r.price
FROM rates r
JOIN equipment_types et ON r.equipment_type_id = et.id
JOIN makes m ON r.make_id = m.id
JOIN models mo ON r.model_id = mo.id
WHERE m.name = 'Caterpillar'
ORDER BY et.name, mo.name;

SELECT 'Verification - Rates by make:' as step;
SELECT
  m.name as make,
  COUNT(*) as rate_count
FROM rates r
JOIN makes m ON r.make_id = m.id
GROUP BY m.name
ORDER BY rate_count DESC;
