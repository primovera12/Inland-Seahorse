-- ============================================================
-- FIX: Allow NULL prices in rates table
-- ============================================================
-- This removes the NOT NULL constraint from the price column
-- so you can pre-populate rates with NULL prices and fill them in later
-- ============================================================

-- Step 1: Remove NOT NULL constraint from price column
ALTER TABLE rates ALTER COLUMN price DROP NOT NULL;

-- Verify the change
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rates' AND column_name = 'price';

-- ============================================================
-- PRE-POPULATE COMMON EQUIPMENT RATES (NULL PRICES)
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
  AND mo.name IN ('210G', '225D', '250G', '350G', '380G')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BULLDOZERS - Caterpillar
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Bulldozer'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
  AND mo.name IN ('D4', 'D5', 'D6', 'D6T', 'D7', 'D7R', 'D8', 'D8T', 'D9', 'D10')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BULLDOZERS - Komatsu
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Bulldozer'
  AND m.name = 'Komatsu'
  AND mo.make_id = m.id
  AND mo.name IN ('D51', 'D61', 'D65', 'D85', 'D155', 'D275')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BULLDOZERS - John Deere
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Bulldozer'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
  AND mo.name IN ('450K', '550K', '650K', '700K', '750K', '850K')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- WHEEL LOADERS - Caterpillar
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Wheel Loader'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
  AND mo.name IN ('924', '930', '938', '950', '962', '966', '972', '980', '988')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- WHEEL LOADERS - Komatsu
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Wheel Loader'
  AND m.name = 'Komatsu'
  AND mo.make_id = m.id
  AND mo.name IN ('WA200', 'WA250', 'WA320', 'WA380', 'WA470', 'WA500')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- WHEEL LOADERS - John Deere
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Wheel Loader'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
  AND mo.name IN ('524K', '544K', '624K', '644K', '724K', '744K', '824K')
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
  AND mo.name IN ('S450', 'S510', 'S530', 'S550', 'S570', 'S590', 'S630', 'S650', 'S740', 'S750', 'S770', 'S850')
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
  AND mo.name IN ('226D', '236D', '242D', '246D', '252D', '262D', '272D', '289D', '299D')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SKID STEERS - John Deere
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Skid Steer'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
  AND mo.name IN ('312GR', '314G', '316GR', '318G', '320G', '324G', '328G', '332G')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- FORKLIFTS - Toyota
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Forklift'
  AND m.name = 'Toyota'
  AND mo.make_id = m.id
  AND mo.name IN ('8FGCU25', '8FGCU30', '8FGU25', '8FGU30', '8FGU32', '52-6FGU25', '52-6FGU30')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- FORKLIFTS - Hyster
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Forklift'
  AND m.name = 'Hyster'
  AND mo.make_id = m.id
  AND mo.name IN ('H40FT', 'H50FT', 'H60FT', 'H80FT', 'H100FT', 'H155FT')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- FORKLIFTS - Yale
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Forklift'
  AND m.name = 'Yale'
  AND mo.make_id = m.id
  AND mo.name IN ('GLC040VX', 'GLC050VX', 'GLC060VX', 'GLC080VX', 'GDP080VX', 'GDP100VX')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- FORKLIFTS - Crown
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Forklift'
  AND m.name = 'Crown'
  AND mo.make_id = m.id
  AND mo.name IN ('SC4500', 'SC5200', 'SC6000', 'FC4500', 'FC5200')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BACKHOES - Caterpillar
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Backhoe'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
  AND mo.name IN ('416F', '420F', '430F', '450')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BACKHOES - John Deere
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Backhoe'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
  AND mo.name IN ('310L', '310SL', '410L', '710L')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BACKHOES - Case
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Backhoe'
  AND m.name = 'Case'
  AND mo.make_id = m.id
  AND mo.name IN ('580N', '580SM', '580SN', '590SN')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- TELEHANDLERS - JCB
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Telehandler'
  AND m.name = 'JCB'
  AND mo.make_id = m.id
  AND mo.name IN ('520-40', '525-60', '535-95', '535-140', '540-140', '540-170', '550-80')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- TELEHANDLERS - Caterpillar
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Telehandler'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
  AND mo.name IN ('TH255', 'TH337', 'TH357', 'TH414', 'TH514')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- TELEHANDLERS - JLG
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Telehandler'
  AND m.name = 'JLG'
  AND mo.make_id = m.id
  AND mo.name IN ('G5-18A', 'G9-43A', '1055', '1644')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- CRANES - Tadano
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Crane'
  AND m.name = 'Tadano'
  AND mo.make_id = m.id
  AND mo.name IN ('GR-500EX', 'GR-600EX', 'GR-750EX', 'ATF 70G-4')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- CRANES - Grove
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Crane'
  AND m.name = 'Grove'
  AND mo.make_id = m.id
  AND mo.name IN ('RT540E', 'RT550E', 'RT760E', 'RT765E', 'RT890E')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- CRANES - Liebherr
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Crane'
  AND m.name = 'Liebherr'
  AND mo.make_id = m.id
  AND mo.name IN ('LTM1040', 'LTM1060', 'LTM1090', 'LTM1130')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BOOM LIFTS - Genie
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Boom Lift'
  AND m.name = 'Genie'
  AND mo.make_id = m.id
  AND mo.name IN ('S-40', 'S-45', 'S-60', 'S-65', 'S-80', 'S-85', 'Z-45', 'Z-60')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- BOOM LIFTS - JLG
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Boom Lift'
  AND m.name = 'JLG'
  AND mo.make_id = m.id
  AND mo.name IN ('400S', '450AJ', '600S', '600A', '660SJ', '800AJ')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SCISSOR LIFTS - Genie
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Scissor Lift'
  AND m.name = 'Genie'
  AND mo.make_id = m.id
  AND mo.name IN ('GS-1930', 'GS-1932', 'GS-2632', 'GS-3232', 'GS-4047')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- SCISSOR LIFTS - Skyjack
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Scissor Lift'
  AND m.name = 'Skyjack'
  AND mo.make_id = m.id
  AND mo.name IN ('SJ3219', 'SJ3226', 'SJ4626', 'SJ6826RT', 'SJ6832RT')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- TRACTORS - John Deere
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Tractor'
  AND m.name = 'John Deere'
  AND mo.make_id = m.id
  AND mo.name IN ('5075E', '6120R', '6130R', '6140R', '6155R', '6175R', '7210R', '7230R', '8245R', '8270R', '8320R', '8345R')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- TRACTORS - Case
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Tractor'
  AND m.name = 'Case'
  AND mo.make_id = m.id
  AND mo.name IN ('Farmall 75C', 'Farmall 95C', 'Maxxum 125', 'Maxxum 145', 'Puma 185', 'Puma 210')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- MINI EXCAVATORS - Caterpillar
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Mini Excavator'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
  AND mo.name IN ('301.7', '302.7', '303.5', '304', '305', '305.5')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- MINI EXCAVATORS - Bobcat
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Mini Excavator'
  AND m.name = 'Bobcat'
  AND mo.make_id = m.id
  AND mo.name IN ('E17', 'E19', 'E20', 'E26', 'E32', 'E35', 'E42', 'E50')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- MINI EXCAVATORS - Kubota
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Mini Excavator'
  AND m.name = 'Kubota'
  AND mo.make_id = m.id
  AND mo.name IN ('KX040-4', 'KX057-5', 'U17', 'U25', 'U35', 'U55')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- COMPACT TRACK LOADERS - Bobcat
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Compact Track Loader'
  AND m.name = 'Bobcat'
  AND mo.make_id = m.id
  AND mo.name IN ('T450', 'T550', 'T590', 'T630', 'T650', 'T770')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- COMPACT TRACK LOADERS - Caterpillar
INSERT INTO rates (equipment_type_id, make_id, model_id, price)
SELECT et.id, m.id, mo.id, NULL
FROM equipment_types et
CROSS JOIN makes m
CROSS JOIN models mo
WHERE et.name = 'Compact Track Loader'
  AND m.name = 'Caterpillar'
  AND mo.make_id = m.id
  AND mo.name IN ('249D', '259D', '279D', '289D', '299D')
ON CONFLICT (equipment_type_id, make_id, model_id) DO NOTHING;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Show total pre-populated rates with NULL prices
SELECT
  'Total pre-populated rates with NULL prices' as info,
  COUNT(*) as count
FROM rates
WHERE price IS NULL;

-- Show breakdown by equipment type
SELECT
  et.name as equipment_type,
  COUNT(*) as count_with_null_prices
FROM rates r
JOIN equipment_types et ON r.equipment_type_id = et.id
WHERE r.price IS NULL
GROUP BY et.name
ORDER BY COUNT(*) DESC;
