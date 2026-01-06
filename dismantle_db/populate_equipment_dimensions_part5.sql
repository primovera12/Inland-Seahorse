-- Equipment Dimensions Part 5: Case CX excavators, Terex mini excavators, ASV track loaders,
-- Hitachi excavators, Backhoe loaders (Cat, Case, JCB, John Deere), Sumitomo, Mecalac, Gradall, and more
-- Units: weight in lbs, dimensions in feet, power in HP, bucket capacity in cubic yards, track width in inches

-- =====================================================
-- CASE CX SERIES EXCAVATORS
-- =====================================================

-- Case CX130D Excavator
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 29131, 27700, 34.1, 8.83, 9.22, 102, 0.37, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX130D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Case CX160D Excavator
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 39683, 37800, 32.15, 9.51, 9.84, 121, 0.65, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX160D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Case CX210D Excavator
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 51900, 49400, 31.1, 9.81, 10.86, 160, 1.31, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX210D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Case CX250D Excavator
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 56909, 54200, 31.2, 9.81, 10.47, 177, 1.31, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX250D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Case CX300D Excavator
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 69007, 65700, 34.78, 10.5, 10.83, 212, 1.57, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX300D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Case CX350D Excavator
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 82483, 78500, 36.65, 10.5, 11.38, 268, 1.83, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX350D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Case CX470C Excavator
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 103600, 98500, 39.37, 11.15, 11.65, 347, 2.35, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = 'CX470C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- TEREX MINI EXCAVATORS
-- =====================================================

-- Terex TC35
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7716, 7350, 16.9, 4.92, 8.27, 32, 0.13, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Terex' AND m.name = 'TC35'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Terex TC50
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11070, 10625, 17.68, 6.53, 8.37, 36, 0.18, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Terex' AND m.name = 'TC50'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Terex TC75
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 17200, 16400, 21.33, 7.87, 8.86, 55, 0.31, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Terex' AND m.name = 'TC75'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- ASV COMPACT TRACK LOADERS
-- =====================================================

-- ASV RT-30
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 3600, 3245, 9.83, 4.0, 7.25, 33, 0.35, 11.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'ASV' AND m.name = 'RT-30'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ASV RT-40
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 5200, 4800, 10.17, 4.75, 7.5, 40, 0.45, 13.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'ASV' AND m.name = 'RT-40'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ASV RT-50
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 6900, 6400, 11.5, 5.33, 7.67, 50, 0.5, 15.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'ASV' AND m.name = 'RT-50'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ASV RT-65
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7950, 7400, 12.0, 5.58, 7.75, 65, 0.55, 16.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'ASV' AND m.name = 'RT-65'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ASV RT-75
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9180, 8625, 12.5, 5.83, 7.83, 74, 0.6, 18.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'ASV' AND m.name = 'RT-75'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ASV RT-120
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11265, 10500, 13.08, 5.92, 8.0, 120, 0.75, 18.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'ASV' AND m.name = 'RT-120'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- MUSTANG TRACK LOADERS
-- =====================================================

-- Mustang 1750RT
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 8250, 7800, 11.83, 5.75, 7.67, 61, 0.5, 15.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Mustang' AND m.name = '1750RT'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Mustang 2100RT
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9890, 9350, 12.17, 5.79, 7.75, 72, 0.55, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Mustang' AND m.name = '2100RT'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Mustang 2500RT
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11200, 10600, 12.67, 6.08, 7.92, 83, 0.65, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Mustang' AND m.name = '2500RT'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- HITACHI EXCAVATORS
-- =====================================================

-- Hitachi ZX35U-5
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 8157, 7750, 15.75, 5.58, 8.17, 24, 0.13, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX35U-5'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX55U-5
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11500, 10900, 18.11, 6.56, 8.3, 40, 0.25, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX55U-5'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX85USB-5
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18290, 17400, 22.37, 7.41, 8.3, 66, 0.37, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX85USB-5'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX130-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 30203, 28700, 25.3, 8.17, 9.42, 95, 0.65, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX130-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX160LC-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 38360, 36500, 28.54, 8.53, 9.68, 122, 0.85, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX160LC-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX200-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 44000, 41900, 29.53, 9.19, 9.84, 150, 1.05, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX200-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX225USLC-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 52800, 50200, 30.84, 9.84, 9.84, 163, 1.18, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX225USLC-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX250LC-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 56660, 53900, 32.81, 10.17, 10.17, 177, 1.31, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX250LC-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX300LC-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 69445, 66100, 35.1, 10.83, 10.73, 212, 1.57, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX300LC-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX350LC-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 77160, 73400, 36.81, 10.47, 10.73, 281, 1.83, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX350LC-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX470LC-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 106260, 101100, 40.03, 11.48, 11.65, 347, 2.48, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX470LC-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hitachi ZX490LCH-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 115740, 110100, 41.34, 11.81, 11.81, 378, 2.75, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hitachi' AND m.name = 'ZX490LCH-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- SUMITOMO EXCAVATORS
-- =====================================================

-- Sumitomo SH135X-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 30865, 29400, 26.57, 8.53, 9.19, 90, 0.65, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Sumitomo' AND m.name = 'SH135X-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Sumitomo SH210-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 44312, 42200, 31.04, 9.19, 9.71, 160, 1.05, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Sumitomo' AND m.name = 'SH210-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Sumitomo SH250-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 56880, 54100, 32.48, 9.84, 10.17, 184, 1.31, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Sumitomo' AND m.name = 'SH250-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Sumitomo SH350-6
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 77160, 73400, 36.42, 10.83, 10.5, 252, 1.7, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Sumitomo' AND m.name = 'SH350-6'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- IHI MINI EXCAVATORS
-- =====================================================

-- IHI 35N
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 6600, 6300, 15.91, 5.08, 7.74, 24, 0.09, 26.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'IHI' AND m.name = '35N'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- IHI 55N
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11900, 11300, 18.37, 6.56, 8.37, 39, 0.2, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'IHI' AND m.name = '55N'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- IHI 80NX
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 17637, 16800, 21.0, 7.22, 8.86, 55, 0.33, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'IHI' AND m.name = '80NX'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- MECALAC EXCAVATORS
-- =====================================================

-- Mecalac 6MCR
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 13228, 12600, 9.84, 6.56, 8.86, 55, 0.26, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Mecalac' AND m.name = '6MCR'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Mecalac 8MCR
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 15873, 15100, 10.27, 6.89, 9.02, 75, 0.29, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Mecalac' AND m.name = '8MCR'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Mecalac 10MCR
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 21605, 20500, 10.83, 7.54, 9.35, 100, 0.39, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Mecalac' AND m.name = '10MCR'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Mecalac 12MTX
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 26455, 25200, 21.33, 8.2, 10.17, 100, 0.52, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Mecalac' AND m.name = '12MTX'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- GRADALL EXCAVATORS
-- =====================================================

-- Gradall XL3100
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 37478, 35700, 26.57, 8.0, 11.42, 173, 0.5, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Gradall' AND m.name = 'XL3100'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Gradall XL4100
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 47410, 45100, 27.89, 8.0, 12.3, 215, 0.71, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Gradall' AND m.name = 'XL4100'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Gradall XL5100
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 57320, 54600, 29.53, 8.5, 12.63, 260, 0.85, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Gradall' AND m.name = 'XL5100'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- BACKHOE LOADERS - CATERPILLAR
-- =====================================================

-- Caterpillar 416F2
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 14068, 13400, 23.33, 7.5, 11.58, 87, 1.0, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '416F2'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar 420F2
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 15395, 14700, 23.52, 7.58, 11.75, 93, 1.1, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '420F2'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar 420XE
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 17637, 16800, 24.28, 7.67, 11.83, 101, 1.15, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '420XE'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar 430F2
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 19180, 18300, 24.61, 7.83, 11.92, 107, 1.25, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '430F2'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar 432F2
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 19400, 18500, 24.77, 7.92, 12.0, 107, 1.25, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '432F2'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar 440
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 21385, 20400, 25.26, 8.0, 12.17, 115, 1.35, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '440'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- BACKHOE LOADERS - CASE
-- =====================================================

-- Case 580N
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 14330, 13600, 22.97, 6.79, 8.79, 85, 0.9, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '580N'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Case 580 Super N
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 17838, 17000, 23.43, 6.79, 8.79, 97, 1.01, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '580 Super N'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Case 580SN WT
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18078, 17200, 23.43, 7.15, 9.15, 97, 1.05, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '580SN WT'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Case 590 Super N
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 20503, 19500, 24.93, 7.22, 9.35, 110, 1.15, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '590 Super N'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- BACKHOE LOADERS - JCB
-- =====================================================

-- JCB 3CX
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 16982, 16200, 23.62, 7.71, 11.84, 92, 1.31, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = '3CX'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- JCB 3CX Compact
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 13514, 12900, 18.54, 6.89, 11.15, 74, 1.05, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = '3CX Compact'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- JCB 4CX
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 20282, 19300, 24.61, 7.87, 12.14, 100, 1.44, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = '4CX'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- JCB 5CX
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 22487, 21400, 25.43, 8.04, 12.47, 109, 1.57, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = '5CX'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- BACKHOE LOADERS - JOHN DEERE
-- =====================================================

-- John Deere 310L
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 14500, 13800, 23.0, 7.58, 9.33, 93, 1.0, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '310L'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- John Deere 310SL
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 15872, 15100, 23.88, 7.83, 9.15, 101, 1.12, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '310SL'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- John Deere 315SL
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 16800, 16000, 24.44, 7.92, 9.42, 107, 1.18, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '315SL'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- John Deere 410L
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18700, 17800, 25.1, 8.08, 9.67, 115, 1.25, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '410L'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- KUBOTA MINI EXCAVATORS (additional models)
-- =====================================================

-- Kubota U35-4
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7990, 7600, 16.08, 5.75, 8.17, 24, 0.13, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'U35-4'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Kubota U55-4
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 12335, 11700, 17.76, 6.43, 8.37, 47, 0.2, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'U55-4'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Kubota KX080-4
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18739, 17800, 21.98, 7.68, 8.79, 65, 0.35, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Kubota' AND m.name = 'KX080-4'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- NEW HOLLAND EXCAVATORS
-- =====================================================

-- New Holland E55BX
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 12125, 11500, 18.04, 6.56, 8.37, 42, 0.2, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E55BX'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- New Holland E80C
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18298, 17400, 21.65, 7.54, 8.86, 60, 0.33, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E80C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- New Holland E145C
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 33069, 31500, 27.56, 8.86, 9.51, 106, 0.72, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E145C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- New Holland E175C
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 40565, 38600, 29.53, 9.19, 9.84, 127, 0.92, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E175C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- New Holland E215C
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 47840, 45500, 31.0, 9.81, 10.63, 148, 1.18, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E215C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- New Holland E245C
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 56438, 53700, 32.48, 10.17, 10.83, 177, 1.44, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E245C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- New Holland E305C
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 70768, 67400, 35.76, 10.83, 10.99, 217, 1.7, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E305C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- New Holland E385C
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 88185, 83900, 38.06, 11.15, 11.48, 271, 2.09, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'New Holland' AND m.name = 'E385C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- SENNEBOGEN MATERIAL HANDLERS
-- =====================================================

-- Sennebogen 817E
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 44092, 42000, 26.25, 8.2, 10.5, 122, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Sennebogen' AND m.name = '817E'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Sennebogen 818E
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 48060, 45800, 28.54, 8.33, 10.66, 130, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Sennebogen' AND m.name = '818E'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Sennebogen 821E
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 55116, 52500, 30.84, 8.86, 11.15, 156, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Sennebogen' AND m.name = '821E'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Sennebogen 825E
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 66139, 63000, 32.81, 9.51, 11.48, 190, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Sennebogen' AND m.name = '825E'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Sennebogen 830E
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 77162, 73500, 34.45, 9.84, 11.81, 218, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Sennebogen' AND m.name = '830E'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- =====================================================
-- MANITOU TELEHANDLERS
-- =====================================================

-- Manitou MT625
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 12125, 11500, 16.4, 7.38, 7.38, 75, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Manitou' AND m.name = 'MT625'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Manitou MT932
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 15873, 15100, 18.04, 7.71, 7.87, 100, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Manitou' AND m.name = 'MT932'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Manitou MT1135
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18078, 17200, 18.7, 7.87, 8.04, 100, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Manitou' AND m.name = 'MT1135'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Manitou MT1440
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 22487, 21400, 19.69, 8.2, 8.53, 130, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Manitou' AND m.name = 'MT1440'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Manitou MT1840
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 25629, 24400, 20.21, 8.37, 8.86, 145, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Manitou' AND m.name = 'MT1840'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;
