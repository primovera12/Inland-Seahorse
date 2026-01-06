-- ============================================================
-- POPULATE RATES FOR ALL MAKES
-- ============================================================
-- This creates common equipment combinations for all major makes
-- ============================================================

-- CASE EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Case'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- NEW HOLLAND EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'New Holland'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- VOLVO EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Volvo'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- JCB EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'JCB'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- KUBOTA EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Kubota'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- DOOSAN EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Doosan'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- HYUNDAI EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Hyundai'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- KOBELCO EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Kobelco'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- LIEBHERR EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Liebherr'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- TAKEUCHI EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Takeuchi'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- YANMAR EXCAVATORS
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Excavator'
  AND m.name = 'Yanmar'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - CASE
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Skid Steer'
  AND m.name = 'Case'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - NEW HOLLAND
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Skid Steer'
  AND m.name = 'New Holland'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - JOHN DEERE
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Skid Steer'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - KUBOTA
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Skid Steer'
  AND m.name = 'Kubota'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - TAKEUCHI
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Skid Steer'
  AND m.name = 'Takeuchi'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- DOZERS - CATERPILLAR
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Dozer'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- DOZERS - KOMATSU
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Dozer'
  AND m.name = 'Komatsu'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- DOZERS - JOHN DEERE
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Dozer'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- WHEEL LOADERS - CATERPILLAR
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Wheel Loader'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- WHEEL LOADERS - KOMATSU
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Wheel Loader'
  AND m.name = 'Komatsu'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- WHEEL LOADERS - VOLVO
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Wheel Loader'
  AND m.name = 'Volvo'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- WHEEL LOADERS - JOHN DEERE
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Wheel Loader'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BACKHOES - CATERPILLAR
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Backhoe'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BACKHOES - CASE
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Backhoe'
  AND m.name = 'Case'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BACKHOES - JOHN DEERE
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Backhoe'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BACKHOES - JCB
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Backhoe'
  AND m.name = 'JCB'
  AND mo.make_id = m.id
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- Verification
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
