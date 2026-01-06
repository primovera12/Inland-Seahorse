-- ============================================================
-- CREATE MODELS FOR ALL MAKES AND POPULATE RATES
-- ============================================================
-- This ensures all makes have common models, then creates rates
-- ============================================================

-- CASE MODELS (already created in previous script for excavators, adding more)
DO $$
DECLARE
  case_id uuid;
BEGIN
  SELECT id INTO case_id FROM makes WHERE name = 'Case';
  IF case_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (case_id, 'CX17B'), (case_id, 'CX26B'), (case_id, 'CX35B'),
      (case_id, 'CX50B'), (case_id, 'CX75C'), (case_id, 'CX80C'),
      (case_id, 'CX130D'), (case_id, 'CX145D'), (case_id, 'CX160D'),
      (case_id, 'CX210D'), (case_id, 'CX245D'), (case_id, 'CX300D'),
      -- Backhoes
      (case_id, '580N'), (case_id, '580SN'), (case_id, '590SN'),
      (case_id, '695'), (case_id, '695ST'),
      -- Skid Steers
      (case_id, 'SV185'), (case_id, 'SV250'), (case_id, 'SV280'),
      (case_id, 'SV300'), (case_id, 'SV340'), (case_id, 'TR270'),
      (case_id, 'TR310'), (case_id, 'TR340')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- NEW HOLLAND MODELS
DO $$
DECLARE
  nh_id uuid;
BEGIN
  SELECT id INTO nh_id FROM makes WHERE name = 'New Holland';
  IF nh_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (nh_id, 'E17'), (nh_id, 'E26'), (nh_id, 'E35'),
      (nh_id, 'E50'), (nh_id, 'E75'), (nh_id, 'E80'),
      (nh_id, 'E130'), (nh_id, 'E145'), (nh_id, 'E160'),
      (nh_id, 'E215'), (nh_id, 'E245'), (nh_id, 'E305'),
      -- Backhoes
      (nh_id, 'B90B'), (nh_id, 'B95B'), (nh_id, 'B95C'),
      (nh_id, 'B110B'), (nh_id, 'B115B'),
      -- Skid Steers
      (nh_id, 'L218'), (nh_id, 'L220'), (nh_id, 'L230'),
      (nh_id, 'C227'), (nh_id, 'C232'), (nh_id, 'C238')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- VOLVO MODELS
DO $$
DECLARE
  vol_id uuid;
BEGIN
  SELECT id INTO vol_id FROM makes WHERE name = 'Volvo';
  IF vol_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (vol_id, 'EC15'), (vol_id, 'EC20'), (vol_id, 'EC27'),
      (vol_id, 'EC35'), (vol_id, 'EC55'), (vol_id, 'EC75'),
      (vol_id, 'EC140'), (vol_id, 'EC160'), (vol_id, 'EC200'),
      (vol_id, 'EC220'), (vol_id, 'EC250'), (vol_id, 'EC300'),
      (vol_id, 'EC350'), (vol_id, 'EC380'), (vol_id, 'EC480'),
      -- Wheel Loaders
      (vol_id, 'L60'), (vol_id, 'L70'), (vol_id, 'L90'),
      (vol_id, 'L110'), (vol_id, 'L120'), (vol_id, 'L150'),
      (vol_id, 'L180'), (vol_id, 'L220'), (vol_id, 'L350')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- JCB MODELS
DO $$
DECLARE
  jcb_id uuid;
BEGIN
  SELECT id INTO jcb_id FROM makes WHERE name = 'JCB';
  IF jcb_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (jcb_id, '8014'), (jcb_id, '8018'), (jcb_id, '8026'),
      (jcb_id, '8035'), (jcb_id, '8055'), (jcb_id, '8085'),
      (jcb_id, '130'), (jcb_id, '140'), (jcb_id, '160'),
      (jcb_id, '220'), (jcb_id, '245'), (jcb_id, '330'),
      -- Backhoes
      (jcb_id, '3CX'), (jcb_id, '4CX'), (jcb_id, '5CX'),
      (jcb_id, '1CXT'), (jcb_id, '3CXT')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- KUBOTA MODELS
DO $$
DECLARE
  kub_id uuid;
BEGIN
  SELECT id INTO kub_id FROM makes WHERE name = 'Kubota';
  IF kub_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (kub_id, 'KX018'), (kub_id, 'KX033'), (kub_id, 'KX040'),
      (kub_id, 'KX057'), (kub_id, 'KX080'), (kub_id, 'U17'),
      (kub_id, 'U25'), (kub_id, 'U35'), (kub_id, 'U45'),
      (kub_id, 'U55'), (kub_id, 'KX71'), (kub_id, 'KX91'),
      (kub_id, 'KX121'), (kub_id, 'KX161'),
      -- Skid Steers
      (kub_id, 'SSV65'), (kub_id, 'SSV75'), (kub_id, 'SVL65'),
      (kub_id, 'SVL75'), (kub_id, 'SVL95')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- DOOSAN MODELS
DO $$
DECLARE
  doo_id uuid;
BEGIN
  SELECT id INTO doo_id FROM makes WHERE name = 'Doosan';
  IF doo_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (doo_id, 'DX17Z'), (doo_id, 'DX27Z'), (doo_id, 'DX35Z'),
      (doo_id, 'DX55'), (doo_id, 'DX63'), (doo_id, 'DX85'),
      (doo_id, 'DX140'), (doo_id, 'DX165'), (doo_id, 'DX225'),
      (doo_id, 'DX255'), (doo_id, 'DX300'), (doo_id, 'DX350'),
      (doo_id, 'DX380'), (doo_id, 'DX420'), (doo_id, 'DX490')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- HYUNDAI MODELS
DO $$
DECLARE
  hyu_id uuid;
BEGIN
  SELECT id INTO hyu_id FROM makes WHERE name = 'Hyundai';
  IF hyu_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (hyu_id, 'R17Z'), (hyu_id, 'R30Z'), (hyu_id, 'R35Z'),
      (hyu_id, 'R55'), (hyu_id, 'R60'), (hyu_id, 'R80'),
      (hyu_id, 'R140'), (hyu_id, 'R145'), (hyu_id, 'R160'),
      (hyu_id, 'R210'), (hyu_id, 'R220'), (hyu_id, 'R290'),
      (hyu_id, 'R300'), (hyu_id, 'R360'), (hyu_id, 'R380')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- KOBELCO MODELS
DO $$
DECLARE
  kob_id uuid;
BEGIN
  SELECT id INTO kob_id FROM makes WHERE name = 'Kobelco';
  IF kob_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (kob_id, 'SK17SR'), (kob_id, 'SK30SR'), (kob_id, 'SK55SRX'),
      (kob_id, 'SK85'), (kob_id, 'SK140'), (kob_id, 'SK170'),
      (kob_id, 'SK210'), (kob_id, 'SK260'), (kob_id, 'SK350'),
      (kob_id, 'SK380'), (kob_id, 'SK500'), (kob_id, 'SK850')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- LIEBHERR MODELS
DO $$
DECLARE
  lie_id uuid;
BEGIN
  SELECT id INTO lie_id FROM makes WHERE name = 'Liebherr';
  IF lie_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (lie_id, 'R914'), (lie_id, 'R920'), (lie_id, 'R924'),
      (lie_id, 'R926'), (lie_id, 'R930'), (lie_id, 'R934'),
      (lie_id, 'R938'), (lie_id, 'R944'), (lie_id, 'R950'),
      (lie_id, 'R956'), (lie_id, 'R960'), (lie_id, 'R970'),
      (lie_id, 'R974'), (lie_id, 'R980')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- TAKEUCHI MODELS
DO $$
DECLARE
  tak_id uuid;
BEGIN
  SELECT id INTO tak_id FROM makes WHERE name = 'Takeuchi';
  IF tak_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (tak_id, 'TB210R'), (tak_id, 'TB216'), (tak_id, 'TB219'),
      (tak_id, 'TB225'), (tak_id, 'TB230'), (tak_id, 'TB235'),
      (tak_id, 'TB240'), (tak_id, 'TB250'), (tak_id, 'TB260'),
      (tak_id, 'TB280FR'), (tak_id, 'TB290'), (tak_id, 'TB295W'),
      -- Skid Steers
      (tak_id, 'TL6'), (tak_id, 'TL8'), (tak_id, 'TL10'),
      (tak_id, 'TL12'), (tak_id, 'TS50'), (tak_id, 'TS70'),
      (tak_id, 'TS80')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- YANMAR MODELS
DO $$
DECLARE
  yan_id uuid;
BEGIN
  SELECT id INTO yan_id FROM makes WHERE name = 'Yanmar';
  IF yan_id IS NOT NULL THEN
    INSERT INTO models (make_id, name) VALUES
      -- Excavators
      (yan_id, 'SV08'), (yan_id, 'SV17'), (yan_id, 'SV18'),
      (yan_id, 'SV26'), (yan_id, 'SV40'), (yan_id, 'SV60'),
      (yan_id, 'SV100'), (yan_id, 'VIO17'), (yan_id, 'VIO25'),
      (yan_id, 'VIO35'), (yan_id, 'VIO45'), (yan_id, 'VIO55'),
      (yan_id, 'VIO75'), (yan_id, 'VIO80')
    ON CONFLICT (make_id, name) DO NOTHING;
  END IF;
END $$;

-- Now run the populate-all-makes script inline
-- This creates rates for all equipment type + make + model combinations

-- EXCAVATORS - All makes
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND mo.make_id = m.id
  AND m.name IN ('Caterpillar', 'Komatsu', 'Hitachi', 'John Deere', 'Case', 'New Holland',
                 'Volvo', 'JCB', 'Kubota', 'Doosan', 'Hyundai', 'Kobelco', 'Liebherr',
                 'Takeuchi', 'Yanmar', 'Bobcat')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - All makes
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Skid Steer'
  AND mo.make_id = m.id
  AND m.name IN ('Bobcat', 'Caterpillar', 'Case', 'New Holland', 'John Deere',
                 'Kubota', 'Takeuchi')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BACKHOES - All makes
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Backhoe'
  AND mo.make_id = m.id
  AND m.name IN ('Caterpillar', 'Case', 'John Deere', 'JCB', 'New Holland')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- WHEEL LOADERS - Major makes
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Wheel Loader'
  AND mo.make_id = m.id
  AND m.name IN ('Caterpillar', 'Komatsu', 'Volvo', 'John Deere', 'Case')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- DOZERS - Major makes
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Dozer'
  AND mo.make_id = m.id
  AND m.name IN ('Caterpillar', 'Komatsu', 'John Deere', 'Case')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- Verification
SELECT '=== FINAL RESULTS ===' as info;

SELECT 'Total rates created:' as info;
SELECT COUNT(*) as total_rates FROM rates;

SELECT 'Rates by make:' as info;
SELECT
  m.name as make,
  COUNT(*) as rate_count
FROM rates r
JOIN makes m ON r.make_id = m.id
GROUP BY m.name
ORDER BY rate_count DESC;

SELECT 'Rates by equipment type:' as info;
SELECT
  et.name as equipment_type,
  COUNT(*) as rate_count
FROM rates r
JOIN equipment_types et ON r.equipment_type_id = et.id
GROUP BY et.name
ORDER BY rate_count DESC;

SELECT 'Sample rates from different makes:' as info;
SELECT
  et.name as equipment_type,
  m.name as make,
  mo.name as model,
  r.price
FROM rates r
JOIN equipment_types et ON r.equipment_type_id = et.id
JOIN makes m ON r.make_id = m.id
JOIN models mo ON r.model_id = mo.id
WHERE m.name IN ('Volvo', 'JCB', 'Kubota', 'Doosan', 'Hyundai')
ORDER BY m.name, et.name
LIMIT 20;
