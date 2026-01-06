-- ============================================================
-- POPULATE EQUIPMENT DIMENSIONS TABLE - PART 3
-- ============================================================
-- Additional equipment specifications researched from manufacturer sources
-- Including motor graders, articulated trucks, dozers, and more excavators
-- ============================================================

-- ============================================================
-- CATERPILLAR EXCAVATORS (Additional Medium/Large)
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 81900, 78000, 36.75, 11.33, 10.42, 302, 2.77, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '336'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 39700, 37800, 28.50, 9.67, 9.83, 121, 0.78, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '315'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 57300, 54600, 33.00, 10.50, 10.67, 188, 1.44, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '325'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 160000, 153000, 48.00, 13.50, 13.67, 532, 4.58, 35.4
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '390'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- CATERPILLAR MINI EXCAVATORS (Additional)
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 9239, 8800, 15.50, 5.83, 8.20, 23.6, 0.08, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '303.5'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 13500, 12900, 19.00, 6.50, 8.50, 48.8, 0.16, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '306'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- CATERPILLAR MOTOR GRADERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 35500, 33800, 29.50, 8.17, 10.67, 155
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '120'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 43400, 41400, 33.17, 8.17, 10.67, 183
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '140'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 54700, 52200, 36.00, 8.50, 11.00, 255
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '160'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

-- ============================================================
-- CATERPILLAR ARTICULATED TRUCKS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 56330, 53700, 31.92, 10.07, 12.33, 320
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '730'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 67240, 64100, 35.42, 10.67, 12.67, 381
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '740'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp)
SELECT m.id, 50500, 48200, 29.75, 9.58, 11.67, 272
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '725'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp;

-- ============================================================
-- CATERPILLAR WHEEL LOADERS (Additional)
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 46189, 44000, 27.17, 9.42, 11.58, 245, 4.58
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '950M'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 54433, 52000, 28.67, 10.00, 12.08, 282, 5.25
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '966M'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 65478, 62500, 30.33, 10.50, 12.50, 355, 6.00
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Caterpillar' AND m.name = '972M'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- KOMATSU DOZERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 31438, 30000, 15.75, 9.83, 10.42, 131, 22.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'D51'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 35275, 33600, 16.33, 10.00, 10.50, 152, 24.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'D61'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 50485, 48100, 18.63, 11.48, 10.36, 220, 26.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'D65'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 79145, 75500, 23.17, 12.50, 12.17, 354, 30.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Komatsu' AND m.name = 'D85'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- JOHN DEERE EXCAVATORS (Additional)
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 50463, 48100, 31.25, 10.50, 9.92, 159, 1.18, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '210G'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 59500, 56700, 33.50, 10.75, 10.33, 188, 1.44, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '250G'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 68600, 65400, 35.17, 10.92, 10.67, 212, 1.70, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '300G'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- JOHN DEERE DOZERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 31200, 29700, 15.75, 8.25, 9.67, 130, 22.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '700K'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 35600, 33900, 16.50, 8.00, 10.00, 165, 24.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '750K'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 42558, 40600, 17.67, 8.17, 10.50, 205, 26.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '850K'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 51700, 49300, 18.50, 9.33, 11.00, 235, 28.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '950K'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- JOHN DEERE WHEEL LOADERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 29140, 27800, 24.83, 8.83, 10.67, 165, 3.50
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '544K'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 38750, 36900, 26.00, 9.17, 11.08, 210, 4.25
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '624K'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 49000, 46700, 27.33, 9.67, 11.42, 251, 5.00
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'John Deere' AND m.name = '724K'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- CASE DOZERS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 18200, 17300, 14.03, 6.09, 9.10, 75, 18.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '650K'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 23800, 22700, 15.33, 6.67, 9.50, 90, 20.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '750K'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 30900, 29450, 16.50, 7.33, 10.00, 110, 22.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '850M'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 42000, 40000, 18.00, 8.50, 10.83, 175, 26.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '1150M'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, track_width)
SELECT m.id, 55000, 52500, 19.50, 9.25, 11.50, 205, 28.0
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Case' AND m.name = '1650M'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- JCB EXCAVATORS (Additional)
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 49450, 47100, 32.50, 9.83, 10.08, 172, 1.30, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = 'JS220'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 30500, 29100, 27.00, 8.67, 9.50, 121, 0.78, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = 'JS145'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 37000, 35300, 28.50, 9.33, 9.83, 148, 0.92, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = 'JS160'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 57000, 54400, 33.50, 10.33, 10.42, 197, 1.57, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'JCB' AND m.name = 'JS260'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- SANY EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 48280, 46000, 30.83, 10.42, 9.67, 158, 1.22, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'SANY' AND m.name = 'SY215C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 59500, 56700, 32.50, 10.67, 10.17, 184, 1.57, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'SANY' AND m.name = 'SY265C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 81600, 77800, 36.17, 11.08, 10.83, 270, 2.09, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'SANY' AND m.name = 'SY365C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 35000, 33300, 27.50, 9.00, 9.50, 121, 0.85, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'SANY' AND m.name = 'SY135C'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- LINK-BELT EXCAVATORS
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 48900, 46600, 30.92, 10.50, 10.42, 160, 1.18, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Link-Belt' AND m.name = '210X4'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 58700, 55900, 32.67, 10.75, 10.67, 188, 1.44, 23.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Link-Belt' AND m.name = '250X4'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 67200, 64100, 34.33, 11.00, 11.00, 212, 1.70, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Link-Belt' AND m.name = '300X4'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 82500, 78600, 36.50, 11.33, 11.50, 271, 2.09, 27.6
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Link-Belt' AND m.name = '350X4'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- BOBCAT TRACK LOADERS (Additional)
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 10515, 10000, 9.53, 6.50, 6.78, 92, 0.65
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'T770'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 8645, 8200, 9.17, 6.17, 6.58, 74, 0.54
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'T650'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd)
SELECT m.id, 11070, 10500, 9.83, 6.58, 6.83, 100, 0.72
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Bobcat' AND m.name = 'T870'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd;

-- ============================================================
-- VOLVO EXCAVATORS (Additional Smaller Models)
-- ============================================================

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 6614, 6300, 14.50, 5.58, 7.83, 37.4, 0.09, 11.8
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'EC27'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 11684, 11100, 18.33, 6.50, 8.33, 49.6, 0.18, 15.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'EC55'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

INSERT INTO equipment_dimensions (model_id, operating_weight, shipping_weight, transport_length, transport_width, transport_height, engine_power_hp, bucket_capacity_cu_yd, track_width)
SELECT m.id, 34616, 33000, 27.50, 9.17, 9.67, 121, 0.78, 19.7
FROM models m JOIN makes mk ON m.make_id = mk.id
WHERE mk.name = 'Volvo' AND m.name = 'EC140'
ON CONFLICT (model_id) DO UPDATE SET
  operating_weight = EXCLUDED.operating_weight,
  shipping_weight = EXCLUDED.shipping_weight,
  transport_length = EXCLUDED.transport_length,
  transport_width = EXCLUDED.transport_width,
  transport_height = EXCLUDED.transport_height,
  engine_power_hp = EXCLUDED.engine_power_hp,
  bucket_capacity_cu_yd = EXCLUDED.bucket_capacity_cu_yd,
  track_width = EXCLUDED.track_width;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

SELECT '=== EQUIPMENT DIMENSIONS PART 3 COMPLETE ===' as status;

SELECT 'Total dimensions records after Part 3:' as info;
SELECT COUNT(*) as total_records FROM equipment_dimensions;

SELECT 'Dimensions by make (updated):' as info;
SELECT
  mk.name as make,
  COUNT(*) as dimension_count
FROM equipment_dimensions ed
JOIN models m ON ed.model_id = m.id
JOIN makes mk ON m.make_id = mk.id
GROUP BY mk.name
ORDER BY dimension_count DESC;

SELECT 'New records added in Part 3 - sample:' as info;
SELECT
  mk.name as make,
  m.name as model,
  ed.operating_weight,
  ed.transport_length,
  ed.transport_width,
  ed.transport_height,
  ed.engine_power_hp
FROM equipment_dimensions ed
JOIN models m ON ed.model_id = m.id
JOIN makes mk ON m.make_id = mk.id
WHERE mk.name IN ('SANY', 'Link-Belt', 'JCB', 'John Deere', 'Caterpillar')
ORDER BY mk.name, m.name
LIMIT 30;
