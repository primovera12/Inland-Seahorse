-- ============================================================
-- FIX AND REPOPULATE RATES
-- ============================================================
-- This script will:
-- 1. Check if makes and models exist
-- 2. Create them if they don't exist
-- 3. Properly link models to makes
-- 4. Create rates with correct foreign keys
-- ============================================================

-- First, let's check what we have
SELECT 'Current state:' as step;
SELECT COUNT(*) as total_rates FROM rates;
SELECT COUNT(*) as total_makes FROM makes;
SELECT COUNT(*) as total_models FROM models;
SELECT COUNT(*) as total_equipment_types FROM equipment_types;

-- Check if Caterpillar exists and get its ID
SELECT 'Caterpillar make:' as step;
SELECT * FROM makes WHERE name = 'Caterpillar';

-- Check if Caterpillar models exist
SELECT 'Caterpillar models:' as step;
SELECT mo.*
FROM models mo
JOIN makes m ON mo.make_id = m.id
WHERE m.name = 'Caterpillar';

-- Check sample rates
SELECT 'Sample rates:' as step;
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

-- ============================================================
-- OPTIONAL: DELETE ALL RATES AND START FRESH
-- ============================================================
-- Uncomment the line below if you want to delete all rates and start over:
-- DELETE FROM rates;

-- ============================================================
-- ENSURE EQUIPMENT TYPES EXIST
-- ============================================================
INSERT INTO equipment_types (name) VALUES
  ('Excavator'),
  ('Dozer'),
  ('Wheel Loader'),
  ('Skid Steer'),
  ('Backhoe'),
  ('Motor Grader'),
  ('Articulated Truck'),
  ('Compactor'),
  ('Telehandler'),
  ('Scraper')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ENSURE MAKES EXIST
-- ============================================================
INSERT INTO makes (name) VALUES
  ('Caterpillar'),
  ('John Deere'),
  ('Komatsu'),
  ('Bobcat'),
  ('Kubota'),
  ('Case'),
  ('New Holland'),
  ('Volvo'),
  ('Hitachi'),
  ('JCB'),
  ('Liebherr'),
  ('Doosan'),
  ('Hyundai'),
  ('Kobelco'),
  ('Takeuchi'),
  ('Yanmar')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ENSURE MODELS EXIST AND ARE PROPERLY LINKED
-- ============================================================

-- Caterpillar Excavator Models
DO $$
DECLARE
  cat_id uuid;
BEGIN
  SELECT id INTO cat_id FROM makes WHERE name = 'Caterpillar';

  INSERT INTO models (make_id, name) VALUES
    (cat_id, '303.5'),
    (cat_id, '305.5'),
    (cat_id, '308'),
    (cat_id, '312'),
    (cat_id, '315'),
    (cat_id, '320'),
    (cat_id, '320D'),
    (cat_id, '320E'),
    (cat_id, '323'),
    (cat_id, '325'),
    (cat_id, '330'),
    (cat_id, '330D'),
    (cat_id, '336'),
    (cat_id, '336D'),
    (cat_id, '340'),
    (cat_id, '345'),
    (cat_id, '349'),
    (cat_id, '365')
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

-- Komatsu Models
DO $$
DECLARE
  kom_id uuid;
BEGIN
  SELECT id INTO kom_id FROM makes WHERE name = 'Komatsu';

  INSERT INTO models (make_id, name) VALUES
    (kom_id, 'PC35'),
    (kom_id, 'PC50'),
    (kom_id, 'PC78'),
    (kom_id, 'PC88'),
    (kom_id, 'PC138'),
    (kom_id, 'PC200'),
    (kom_id, 'PC210'),
    (kom_id, 'PC220'),
    (kom_id, 'PC228'),
    (kom_id, 'PC240'),
    (kom_id, 'PC290'),
    (kom_id, 'PC300'),
    (kom_id, 'PC360'),
    (kom_id, 'PC400'),
    (kom_id, 'PC490')
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

-- Hitachi Models
DO $$
DECLARE
  hit_id uuid;
BEGIN
  SELECT id INTO hit_id FROM makes WHERE name = 'Hitachi';

  INSERT INTO models (make_id, name) VALUES
    (hit_id, 'ZX50'),
    (hit_id, 'ZX85'),
    (hit_id, 'ZX120'),
    (hit_id, 'ZX200'),
    (hit_id, 'ZX210'),
    (hit_id, 'ZX225'),
    (hit_id, 'ZX250'),
    (hit_id, 'ZX290'),
    (hit_id, 'ZX350'),
    (hit_id, 'ZX470'),
    (hit_id, 'ZX670')
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

-- John Deere Models
DO $$
DECLARE
  jd_id uuid;
BEGIN
  SELECT id INTO jd_id FROM makes WHERE name = 'John Deere';

  INSERT INTO models (make_id, name) VALUES
    (jd_id, '35G'),
    (jd_id, '50G'),
    (jd_id, '85G'),
    (jd_id, '135G'),
    (jd_id, '210G'),
    (jd_id, '245G'),
    (jd_id, '350G'),
    (jd_id, '380G'),
    (jd_id, '470G')
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

-- Bobcat Models
DO $$
DECLARE
  bob_id uuid;
BEGIN
  SELECT id INTO bob_id FROM makes WHERE name = 'Bobcat';

  INSERT INTO models (make_id, name) VALUES
    (bob_id, 'E26'),
    (bob_id, 'E35'),
    (bob_id, 'E50'),
    (bob_id, 'E85'),
    (bob_id, 'S450'),
    (bob_id, 'S510'),
    (bob_id, 'S570'),
    (bob_id, 'S630'),
    (bob_id, 'S650'),
    (bob_id, 'S750'),
    (bob_id, 'S850'),
    (bob_id, 'T450'),
    (bob_id, 'T550'),
    (bob_id, 'T650')
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

-- ============================================================
-- NOW CREATE RATES WITH PROPER FOREIGN KEYS
-- ============================================================

-- EXCAVATORS - Caterpillar
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
  AND mo.name IN ('320', '320D', '320E', '330', '330D', '336', '336D', '340', '345', '349')
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
  AND mo.name IN ('PC200', 'PC210', 'PC220', 'PC228', 'PC240', 'PC300', 'PC360', 'PC400')
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
  AND mo.name IN ('ZX200', 'ZX210', 'ZX225', 'ZX250', 'ZX350', 'ZX470')
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
  AND mo.name IN ('210G', '245G', '350G', '380G')
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
  AND mo.name IN ('S450', 'S510', 'S570', 'S630', 'S650', 'S750', 'S850', 'T450', 'T550', 'T650')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - Caterpillar
DO $$
DECLARE
  cat_id uuid;
BEGIN
  SELECT id INTO cat_id FROM makes WHERE name = 'Caterpillar';

  -- Create CAT skid steer models
  INSERT INTO models (make_id, name) VALUES
    (cat_id, '236D'),
    (cat_id, '246D'),
    (cat_id, '256D'),
    (cat_id, '262D'),
    (cat_id, '272D'),
    (cat_id, '279D'),
    (cat_id, '289D'),
    (cat_id, '299D')
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

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

-- ============================================================
-- VERIFY THE FIX
-- ============================================================
SELECT 'After fix - Final state:' as step;
SELECT COUNT(*) as total_rates FROM rates;
SELECT COUNT(*) as rates_with_null_price FROM rates WHERE price IS NULL;
SELECT COUNT(*) as rates_with_price FROM rates WHERE price IS NOT NULL;

-- Check Caterpillar rates specifically
SELECT 'Caterpillar rates:' as step;
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
