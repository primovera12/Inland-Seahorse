-- Equipment Dimensions Part 6: John Deere track loaders, Bobcat equipment, Caterpillar rollers,
-- JLG/Genie telehandlers, LiuGong excavators, Dynapac/Hamm rollers, and more
-- Units: weight in lbs, dimensions in feet, power in HP, bucket capacity in cubic yards, track width in inches

-- =====================================================
-- JOHN DEERE COMPACT TRACK LOADERS
-- =====================================================

-- John Deere 317G
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 8423, 8000, 12.17, 6.0, 6.53, 65, 0.45, 15.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '317G'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- John Deere 325G
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9500, 9000, 12.17, 6.08, 7.17, 74, 0.5, 15.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '325G'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- John Deere 331G
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11900, 11300, 12.17, 6.58, 7.22, 91, 0.55, 15.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '331G'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- John Deere 333G
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 12100, 11500, 12.17, 6.73, 7.22, 100, 0.6, 15.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '333G'
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
-- JOHN DEERE SKID STEERS
-- =====================================================

-- John Deere 320G
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7100, 6700, 11.0, 5.75, 6.67, 65, 0.45, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '320G'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- John Deere 324G
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7600, 7200, 11.25, 5.92, 6.75, 74, 0.5, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '324G'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- John Deere 330G
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 8600, 8200, 11.5, 6.17, 6.83, 91, 0.55, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '330G'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- John Deere 332G
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9000, 8500, 11.67, 6.25, 6.92, 100, 0.6, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '332G'
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
-- BOBCAT EXCAVATORS
-- =====================================================

-- Bobcat E42
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9568, 9100, 17.58, 6.08, 8.25, 42, 0.16, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'E42'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat E50
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11000, 10500, 18.17, 6.5, 8.33, 49, 0.2, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'E50'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat E60
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 12315, 11700, 18.19, 6.43, 8.37, 55, 0.24, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'E60'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat E85
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 18960, 18000, 20.23, 7.58, 8.67, 59, 0.33, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'E85'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat E145
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 33069, 31500, 27.89, 8.86, 9.51, 106, 0.72, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'E145'
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
-- BOBCAT SKID STEERS
-- =====================================================

-- Bobcat S530
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 5625, 5350, 10.67, 5.58, 6.42, 49, 0.35, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S530'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat S550
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 6245, 5940, 10.92, 5.75, 6.58, 61, 0.4, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S550'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat S590
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 6875, 6530, 11.17, 5.83, 6.67, 66, 0.45, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S590'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat S650
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 8061, 7660, 11.4, 6.17, 6.78, 74, 0.5, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S650'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat S770
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9314, 8850, 11.8, 6.17, 6.78, 92, 0.55, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S770'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat S850
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 10450, 9930, 12.25, 6.5, 6.92, 100, 0.6, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'S850'
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
-- BOBCAT COMPACT TRACK LOADERS
-- =====================================================

-- Bobcat T550
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7465, 7100, 11.33, 5.58, 6.5, 61, 0.4, 12.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'T550'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat T590
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 8095, 7690, 11.58, 5.67, 6.5, 66, 0.45, 12.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'T590'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat T595
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 8055, 7450, 11.58, 5.58, 6.48, 74, 0.45, 12.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'T595'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat T740
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9765, 9280, 11.92, 6.17, 6.75, 74, 0.5, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'T740'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Bobcat T870
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11730, 11150, 12.33, 6.5, 6.92, 100, 0.6, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'T870'
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
-- CATERPILLAR SKID STEERS & TRACK LOADERS
-- =====================================================

-- Caterpillar 262D3
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7851, 7460, 11.5, 5.92, 6.67, 75, 0.45, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '262D3'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar 272D3 (Skid Steer)
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9127, 8670, 11.75, 6.17, 6.75, 95, 0.55, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '272D3'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar 259D3
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9469, 8995, 11.67, 6.17, 6.75, 75, 0.5, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '259D3'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar 289D3
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 10802, 10260, 12.0, 6.33, 6.83, 95, 0.55, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '289D3'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar 299D3
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 12764, 10420, 12.17, 6.5, 6.92, 95, 0.6, 17.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '299D3'
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
-- CATERPILLAR ROLLERS
-- =====================================================

-- Caterpillar CB24
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 5952, 5650, 7.97, 4.27, 8.46, 33, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'CB24'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar CB34B
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7716, 7330, 9.67, 4.75, 9.0, 49, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'CB34B'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar CS44B
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 17416, 16550, 17.58, 7.0, 9.83, 130, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'CS44B'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar CS56B
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 25346, 24080, 19.25, 7.58, 10.25, 157, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'CS56B'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar CS66B
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 29320, 27850, 19.92, 7.58, 10.42, 173, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'CS66B'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Caterpillar CS78B
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 37478, 35600, 20.83, 7.83, 10.67, 201, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = 'CS78B'
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
-- LIUGONG EXCAVATORS
-- =====================================================

-- LiuGong 9035E
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 8774, 8350, 15.78, 5.58, 8.2, 24, 0.14, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'LiuGong' AND m.name = '9035E'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- LiuGong 906F
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 13448, 12800, 18.7, 6.56, 8.69, 49, 0.22, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'LiuGong' AND m.name = '906F'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- LiuGong 915E
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 35935, 34200, 25.43, 8.17, 9.61, 113, 0.78, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'LiuGong' AND m.name = '915E'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- LiuGong 922E
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 49604, 47200, 30.84, 9.84, 10.33, 148, 1.18, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'LiuGong' AND m.name = '922E'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- LiuGong 925E
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 57320, 54500, 32.48, 10.17, 10.66, 177, 1.44, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'LiuGong' AND m.name = '925E'
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
-- JLG TELEHANDLERS
-- =====================================================

-- JLG G5-18A
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 10582, 10100, 14.58, 6.92, 6.67, 74, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JLG' AND m.name = 'G5-18A'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- JLG G6-42A
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 17857, 17000, 17.25, 7.58, 7.75, 74, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JLG' AND m.name = 'G6-42A'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- JLG G9-43A
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 23148, 22000, 18.83, 7.92, 8.17, 97, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JLG' AND m.name = 'G9-43A'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- JLG G10-55A
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 30644, 29100, 20.0, 8.42, 8.42, 140, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JLG' AND m.name = 'G10-55A'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- JLG G12-55A
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 35860, 34100, 22.02, 8.5, 8.5, 140, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JLG' AND m.name = 'G12-55A'
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
-- GENIE TELEHANDLERS
-- =====================================================

-- Genie GTH-636
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 12500, 11900, 16.67, 7.25, 7.17, 74, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Genie' AND m.name = 'GTH-636'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Genie GTH-844
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 22046, 21000, 18.5, 7.83, 7.92, 99, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Genie' AND m.name = 'GTH-844'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Genie GTH-1056
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 30000, 28500, 22.5, 8.5, 8.5, 121, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Genie' AND m.name = 'GTH-1056'
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
-- HAMM ROLLERS
-- =====================================================

-- Hamm HD12 VV
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 5942, 5650, 8.07, 4.3, 7.83, 31, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hamm' AND m.name = 'HD12 VV'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hamm HD14 VV
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 7716, 7330, 9.33, 4.92, 9.58, 49, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hamm' AND m.name = 'HD14 VV'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hamm HD110
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 24250, 23040, 18.83, 6.92, 10.08, 130, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hamm' AND m.name = 'HD110'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Hamm H11i
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 24692, 23460, 19.08, 7.17, 10.25, 130, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Hamm' AND m.name = 'H11i'
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
-- DYNAPAC ROLLERS
-- =====================================================

-- Dynapac CC1200
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 5700, 5420, 7.83, 4.33, 8.67, 30, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Dynapac' AND m.name = 'CC1200'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Dynapac CC2200
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 8377, 7960, 9.25, 5.42, 9.67, 55, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Dynapac' AND m.name = 'CC2200'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Dynapac CA2500D
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 24250, 23040, 18.67, 7.17, 10.0, 130, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Dynapac' AND m.name = 'CA2500D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- Dynapac CA3500D
INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 28660, 27230, 19.5, 7.42, 10.25, 145, NULL, NULL
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Dynapac' AND m.name = 'CA3500D'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;
